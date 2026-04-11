package com.infotact.wms.putaway;

import com.infotact.wms.inventory.InventoryBalance;
import com.infotact.wms.inventory.InventoryBalanceRepository;
import com.infotact.wms.master.Bin;
import com.infotact.wms.master.BinRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class PutawaySuggestionService {

    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final BinRepository binRepository;

    public PutawaySuggestionService(
            InventoryBalanceRepository inventoryBalanceRepository,
            BinRepository binRepository
    ) {
        this.inventoryBalanceRepository = inventoryBalanceRepository;
        this.binRepository = binRepository;
    }

    /**
     * v1 rules (in order):
     * <ol>
     *     <li>Consolidate into a bin that already has on-hand stock of the same item (highest on-hand first).</li>
     *     <li>Otherwise use the first active bin with no on-hand for this item (empty slot for SKU).</li>
     *     <li>Otherwise first remaining active bin in warehouse order (zone code, bin code).</li>
     * </ol>
     */
    @Transactional(readOnly = true)
    public Optional<PutawaySuggestion> suggest(Long warehouseId, Long itemId, Long excludeBinId) {
        List<InventoryBalance> balances = inventoryBalanceRepository.findForPutawaySuggestion(warehouseId, itemId);
        Comparator<InventoryBalance> consolidateOrder = Comparator
                .comparing(InventoryBalance::getOnHandQty, Comparator.reverseOrder())
                .thenComparing(ib -> ib.getBin().getZone().getCode())
                .thenComparing(ib -> ib.getBin().getCode());

        Optional<Bin> consolidate = balances.stream()
                .filter(ib -> !ib.getBin().getId().equals(excludeBinId))
                .filter(ib -> ib.getBin().isActive())
                .filter(ib -> ib.getOnHandQty().compareTo(BigDecimal.ZERO) > 0)
                .sorted(consolidateOrder)
                .map(InventoryBalance::getBin)
                .findFirst();

        if (consolidate.isPresent()) {
            return Optional.of(new PutawaySuggestion(consolidate.get().getId(), PutawayRule.CONSOLIDATE));
        }

        List<Bin> orderedBins = binRepository.findActiveByWarehouseIdOrderByZoneAndBin(warehouseId);
        for (Bin bin : orderedBins) {
            if (bin.getId().equals(excludeBinId)) {
                continue;
            }
            Optional<InventoryBalance> bal = inventoryBalanceRepository
                    .findByWarehouse_IdAndBin_IdAndItem_Id(warehouseId, bin.getId(), itemId);
            boolean emptyForSku = bal.isEmpty() || bal.get().getOnHandQty().compareTo(BigDecimal.ZERO) == 0;
            if (emptyForSku) {
                return Optional.of(new PutawaySuggestion(bin.getId(), PutawayRule.EMPTY_BIN));
            }
        }

        return orderedBins.stream()
                .filter(b -> !b.getId().equals(excludeBinId))
                .findFirst()
                .map(b -> new PutawaySuggestion(b.getId(), PutawayRule.FALLBACK));
    }

    public record PutawaySuggestion(long suggestedBinId, PutawayRule rule) {
    }
}
