package com.infotact.wms.master;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.common.web.Pageables;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.master.dto.AisleRequest;
import com.infotact.wms.master.dto.AisleResponse;
import com.infotact.wms.master.spec.MasterSpecifications;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AisleService {

    private final ZoneRepository zoneRepository;
    private final AisleRepository aisleRepository;

    public AisleService(ZoneRepository zoneRepository, AisleRepository aisleRepository) {
        this.zoneRepository = zoneRepository;
        this.aisleRepository = aisleRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<AisleResponse> listByZone(Long zoneId, String q, Pageable pageable) {
        ensureZone(zoneId);
        Pageable p = Pageables.withDefaultSort(pageable, Sort.by(Sort.Direction.ASC, "code"));
        Specification<Aisle> spec = Specification.where(MasterSpecifications.aisleInZone(zoneId))
                .and(MasterSpecifications.aisleSearch(q));
        return PageResponse.of(aisleRepository.findAll(spec, p).map(MasterDataMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public AisleResponse get(Long id) {
        Aisle a = aisleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aisle not found: " + id));
        touch(a);
        return MasterDataMapper.toResponse(a);
    }

    @Transactional
    public AisleResponse create(Long zoneId, AisleRequest request) {
        Zone zone = ensureZone(zoneId);
        String code = normalizeCode(request.code());
        if (aisleRepository.existsByZone_IdAndCodeIgnoreCase(zoneId, code)) {
            throw new ConflictException("Aisle code already exists in this zone: " + code);
        }
        Aisle a = new Aisle();
        a.setZone(zone);
        a.setCode(code);
        a.setName(request.name().trim());
        Aisle saved = aisleRepository.save(a);
        touch(saved);
        return MasterDataMapper.toResponse(saved);
    }

    @Transactional
    public AisleResponse update(Long id, AisleRequest request) {
        Aisle a = aisleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aisle not found: " + id));
        String code = normalizeCode(request.code());
        Long zoneId = a.getZone().getId();
        if (!code.equalsIgnoreCase(a.getCode())) {
            if (aisleRepository.existsByZone_IdAndCodeIgnoreCase(zoneId, code)) {
                throw new ConflictException("Aisle code already exists in this zone: " + code);
            }
        }
        a.setCode(code);
        a.setName(request.name().trim());
        Aisle saved = aisleRepository.save(a);
        touch(saved);
        return MasterDataMapper.toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        if (!aisleRepository.existsById(id)) {
            throw new ResourceNotFoundException("Aisle not found: " + id);
        }
        aisleRepository.deleteById(id);
    }

    private Zone ensureZone(Long zoneId) {
        return zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + zoneId));
    }

    private static void touch(Aisle a) {
        a.getZone().getWarehouse().getId();
    }

    private static String normalizeCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }
}

