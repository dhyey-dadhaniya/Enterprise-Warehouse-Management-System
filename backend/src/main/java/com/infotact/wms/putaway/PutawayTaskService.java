package com.infotact.wms.putaway;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.common.web.Pageables;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.inbound.InboundDocumentLine;
import com.infotact.wms.inbound.InboundDocumentLineRepository;
import com.infotact.wms.inventory.InventoryBalanceRepository;
import com.infotact.wms.master.Bin;
import com.infotact.wms.master.BinRepository;
import com.infotact.wms.master.Item;
import com.infotact.wms.master.ItemRepository;
import com.infotact.wms.master.Warehouse;
import com.infotact.wms.master.WarehouseRepository;
import com.infotact.wms.putaway.dto.PutawaySuggestionResponse;
import com.infotact.wms.putaway.dto.PutawayTaskCreateRequest;
import com.infotact.wms.putaway.dto.PutawayTaskResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class PutawayTaskService {

    private final PutawayTaskRepository putawayTaskRepository;
    private final PutawaySuggestionService putawaySuggestionService;
    private final WarehouseRepository warehouseRepository;
    private final BinRepository binRepository;
    private final ItemRepository itemRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final InboundDocumentLineRepository inboundDocumentLineRepository;

    public PutawayTaskService(
            PutawayTaskRepository putawayTaskRepository,
            PutawaySuggestionService putawaySuggestionService,
            WarehouseRepository warehouseRepository,
            BinRepository binRepository,
            ItemRepository itemRepository,
            InventoryBalanceRepository inventoryBalanceRepository,
            InboundDocumentLineRepository inboundDocumentLineRepository
    ) {
        this.putawayTaskRepository = putawayTaskRepository;
        this.putawaySuggestionService = putawaySuggestionService;
        this.warehouseRepository = warehouseRepository;
        this.binRepository = binRepository;
        this.itemRepository = itemRepository;
        this.inventoryBalanceRepository = inventoryBalanceRepository;
        this.inboundDocumentLineRepository = inboundDocumentLineRepository;
    }

    @Transactional(readOnly = true)
    public PutawaySuggestionResponse previewSuggestion(Long warehouseId, Long itemId, Long fromBinId) {
        warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + warehouseId));
        Bin from = loadBinInWarehouse(fromBinId, warehouseId);
        itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + itemId));
        PutawaySuggestionService.PutawaySuggestion suggestion = putawaySuggestionService
                .suggest(warehouseId, itemId, fromBinId)
                .orElseThrow(() -> new ConflictException("No suitable storage bin found for putaway"));
        return new PutawaySuggestionResponse(warehouseId, itemId, from.getId(), suggestion.suggestedBinId(), suggestion.rule());
    }

    @Transactional(readOnly = true)
    public PageResponse<PutawayTaskResponse> list(Long warehouseId, Pageable pageable) {
        Pageable p = Pageables.withDefaultSort(pageable, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PutawayTask> page = warehouseId == null
                ? putawayTaskRepository.findAll(p)
                : putawayTaskRepository.findByWarehouse_Id(warehouseId, p);
        return PageResponse.of(page.map(PutawayMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public PutawayTaskResponse get(Long id) {
        PutawayTask task = putawayTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Putaway task not found: " + id));
        touch(task);
        return PutawayMapper.toResponse(task);
    }

    @Transactional
    public PutawayTaskResponse create(PutawayTaskCreateRequest request) {
        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + request.warehouseId()));
        Bin fromBin = loadBinInWarehouse(request.fromBinId(), warehouse.getId());
        Item item = itemRepository.findById(request.itemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + request.itemId()));

        BigDecimal available = inventoryBalanceRepository
                .findByWarehouse_IdAndBin_IdAndItem_Id(warehouse.getId(), fromBin.getId(), item.getId())
                .map(b -> b.getOnHandQty())
                .orElse(BigDecimal.ZERO);
        if (available.compareTo(request.quantity()) < 0) {
            throw new ConflictException("Insufficient quantity at from-bin for putaway (on hand: " + available + ")");
        }

        InboundDocumentLine line = null;
        if (request.inboundDocumentLineId() != null) {
            line = inboundDocumentLineRepository.findById(request.inboundDocumentLineId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Inbound line not found: " + request.inboundDocumentLineId()));
            if (!line.getItem().getId().equals(item.getId())) {
                throw new ConflictException("Inbound line item does not match putaway item");
            }
            if (!line.getDocument().getWarehouse().getId().equals(warehouse.getId())) {
                throw new ConflictException("Inbound line warehouse does not match");
            }
        }

        PutawaySuggestionService.PutawaySuggestion suggestion = putawaySuggestionService
                .suggest(warehouse.getId(), item.getId(), fromBin.getId())
                .orElseThrow(() -> new ConflictException("No suitable storage bin found for putaway"));

        Bin suggestedTo = binRepository.findById(suggestion.suggestedBinId())
                .orElseThrow(() -> new ResourceNotFoundException("Suggested bin not found: " + suggestion.suggestedBinId()));
        if (!suggestedTo.getZone().getWarehouse().getId().equals(warehouse.getId())) {
            throw new ConflictException("Suggested bin is not in the same warehouse");
        }

        PutawayTask task = new PutawayTask();
        task.setWarehouse(warehouse);
        task.setStatus(PutawayTaskStatus.PENDING);
        task.setFromBin(fromBin);
        task.setSuggestedToBin(suggestedTo);
        task.setItem(item);
        task.setQuantity(request.quantity());
        task.setSuggestionRule(suggestion.rule());
        task.setInboundLine(line);

        PutawayTask saved = putawayTaskRepository.save(task);
        touch(saved);
        return PutawayMapper.toResponse(saved);
    }

    private static void touch(PutawayTask t) {
        t.getWarehouse().getId();
        t.getFromBin().getCode();
        t.getSuggestedToBin().getCode();
        t.getItem().getSku();
        if (t.getInboundLine() != null) {
            t.getInboundLine().getId();
        }
    }

    private Bin loadBinInWarehouse(Long binId, Long warehouseId) {
        Bin bin = binRepository.findById(binId)
                .orElseThrow(() -> new ResourceNotFoundException("Bin not found: " + binId));
        if (!bin.getZone().getWarehouse().getId().equals(warehouseId)) {
            throw new ConflictException("Bin is not in the given warehouse");
        }
        return bin;
    }
}
