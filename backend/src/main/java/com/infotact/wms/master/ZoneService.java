package com.infotact.wms.master;

import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.master.dto.ZoneRequest;
import com.infotact.wms.master.dto.ZoneResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class ZoneService {

    private final WarehouseRepository warehouseRepository;
    private final ZoneRepository zoneRepository;

    public ZoneService(WarehouseRepository warehouseRepository, ZoneRepository zoneRepository) {
        this.warehouseRepository = warehouseRepository;
        this.zoneRepository = zoneRepository;
    }

    @Transactional(readOnly = true)
    public List<ZoneResponse> listByWarehouse(Long warehouseId) {
        ensureWarehouse(warehouseId);
        return zoneRepository.findByWarehouse_IdOrderByCodeAsc(warehouseId).stream()
                .map(MasterDataMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ZoneResponse get(Long id) {
        Zone z = zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + id));
        return MasterDataMapper.toResponse(z);
    }

    @Transactional
    public ZoneResponse create(Long warehouseId, ZoneRequest request) {
        Warehouse wh = ensureWarehouse(warehouseId);
        String code = normalizeCode(request.code());
        if (zoneRepository.existsByWarehouse_IdAndCodeIgnoreCase(warehouseId, code)) {
            throw new ConflictException("Zone code already exists in this warehouse: " + code);
        }
        Zone z = new Zone();
        z.setWarehouse(wh);
        z.setCode(code);
        z.setName(request.name().trim());
        return MasterDataMapper.toResponse(zoneRepository.save(z));
    }

    @Transactional
    public ZoneResponse update(Long id, ZoneRequest request) {
        Zone z = zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + id));
        String code = normalizeCode(request.code());
        Long whId = z.getWarehouse().getId();
        if (!code.equalsIgnoreCase(z.getCode())) {
            if (zoneRepository.existsByWarehouse_IdAndCodeIgnoreCase(whId, code)) {
                throw new ConflictException("Zone code already exists in this warehouse: " + code);
            }
        }
        z.setCode(code);
        z.setName(request.name().trim());
        return MasterDataMapper.toResponse(zoneRepository.save(z));
    }

    @Transactional
    public void delete(Long id) {
        if (!zoneRepository.existsById(id)) {
            throw new ResourceNotFoundException("Zone not found: " + id);
        }
        zoneRepository.deleteById(id);
    }

    private Warehouse ensureWarehouse(Long warehouseId) {
        return warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + warehouseId));
    }

    private static String normalizeCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }
}
