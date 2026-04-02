package com.infotact.wms.master;

import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.master.dto.ItemRequest;
import com.infotact.wms.master.dto.ItemResponse;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class ItemService {

    private final ItemRepository itemRepository;

    public ItemService(ItemRepository itemRepository) {
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> list() {
        return itemRepository.findAll(Sort.by(Sort.Direction.ASC, "sku")).stream()
                .map(MasterDataMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ItemResponse get(Long id) {
        return MasterDataMapper.toResponse(itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id)));
    }

    @Transactional
    public ItemResponse create(ItemRequest request) {
        String sku = normalizeSku(request.sku());
        if (itemRepository.existsBySkuIgnoreCase(sku)) {
            throw new ConflictException("SKU already exists: " + sku);
        }
        Item item = new Item();
        item.setSku(sku);
        item.setName(request.name().trim());
        item.setDescription(trimToNull(request.description()));
        item.setBaseUom(normalizeUom(request.baseUom()));
        item.setActive(request.active() == null || request.active());
        return MasterDataMapper.toResponse(itemRepository.save(item));
    }

    @Transactional
    public ItemResponse update(Long id, ItemRequest request) {
        Item item = itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id));
        String sku = normalizeSku(request.sku());
        if (!sku.equalsIgnoreCase(item.getSku()) && itemRepository.existsBySkuIgnoreCase(sku)) {
            throw new ConflictException("SKU already exists: " + sku);
        }
        item.setSku(sku);
        item.setName(request.name().trim());
        item.setDescription(trimToNull(request.description()));
        if (request.baseUom() != null && !request.baseUom().isBlank()) {
            item.setBaseUom(request.baseUom().trim().toUpperCase(Locale.ROOT));
        }
        if (request.active() != null) {
            item.setActive(request.active());
        }
        return MasterDataMapper.toResponse(itemRepository.save(item));
    }

    @Transactional
    public void delete(Long id) {
        if (!itemRepository.existsById(id)) {
            throw new ResourceNotFoundException("Item not found: " + id);
        }
        itemRepository.deleteById(id);
    }

    private static String normalizeSku(String sku) {
        return sku.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeUom(String uom) {
        if (uom == null || uom.isBlank()) {
            return "EA";
        }
        return uom.trim().toUpperCase(Locale.ROOT);
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
