package com.infotact.wms.master;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.common.web.Pageables;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.master.dto.WarehouseRequest;
import com.infotact.wms.master.dto.WarehouseResponse;
import com.infotact.wms.master.spec.MasterSpecifications;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;

    public WarehouseService(WarehouseRepository warehouseRepository) {
        this.warehouseRepository = warehouseRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<WarehouseResponse> list(String q, Pageable pageable) {
        Pageable p = Pageables.withDefaultSort(pageable, Sort.by(Sort.Direction.ASC, "code"));
        Specification<Warehouse> spec = Specification.where(MasterSpecifications.warehouseSearch(q));
        return PageResponse.of(warehouseRepository.findAll(spec, p).map(MasterDataMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public WarehouseResponse get(Long id) {
        return MasterDataMapper.toResponse(warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + id)));
    }

    @Transactional
    public WarehouseResponse create(WarehouseRequest request) {
        String code = normalizeCode(request.code());
        if (warehouseRepository.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("Warehouse code already exists: " + code);
        }
        Warehouse w = new Warehouse();
        w.setCode(code);
        w.setName(request.name().trim());
        w.setAddressLine(trimToNull(request.addressLine()));
        return MasterDataMapper.toResponse(warehouseRepository.save(w));
    }

    @Transactional
    public WarehouseResponse update(Long id, WarehouseRequest request) {
        Warehouse w = warehouseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found: " + id));
        String code = normalizeCode(request.code());
        if (!code.equalsIgnoreCase(w.getCode()) && warehouseRepository.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("Warehouse code already exists: " + code);
        }
        w.setCode(code);
        w.setName(request.name().trim());
        w.setAddressLine(trimToNull(request.addressLine()));
        return MasterDataMapper.toResponse(warehouseRepository.save(w));
    }

    @Transactional
    public void delete(Long id) {
        if (!warehouseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Warehouse not found: " + id);
        }
        warehouseRepository.deleteById(id);
    }

    private static String normalizeCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
