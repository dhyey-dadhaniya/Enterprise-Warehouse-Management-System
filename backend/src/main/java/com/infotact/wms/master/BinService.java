package com.infotact.wms.master;

import com.infotact.wms.common.dto.PageResponse;
import com.infotact.wms.common.web.Pageables;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.master.dto.BinRequest;
import com.infotact.wms.master.dto.BinResponse;
import com.infotact.wms.master.spec.MasterSpecifications;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class BinService {

    private final ZoneRepository zoneRepository;
    private final AisleRepository aisleRepository;
    private final BinRepository binRepository;

    public BinService(ZoneRepository zoneRepository, AisleRepository aisleRepository, BinRepository binRepository) {
        this.zoneRepository = zoneRepository;
        this.aisleRepository = aisleRepository;
        this.binRepository = binRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<BinResponse> listByZone(Long zoneId, String q, Boolean active, Pageable pageable) {
        ensureZone(zoneId);
        Pageable p = Pageables.withDefaultSort(pageable, Sort.by(Sort.Direction.ASC, "code"));
        Specification<Bin> spec = Specification.where(MasterSpecifications.binInZone(zoneId))
                .and(MasterSpecifications.binSearch(q))
                .and(MasterSpecifications.binActive(active));
        return PageResponse.of(binRepository.findAll(spec, p).map(MasterDataMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public BinResponse get(Long id) {
        Bin b = binRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bin not found: " + id));
        touchAssociations(b);
        return MasterDataMapper.toResponse(b);
    }

    @Transactional
    public BinResponse create(Long zoneId, BinRequest request) {
        Zone zone = ensureZone(zoneId);
        Aisle aisle = request.aisleId() == null ? null : ensureAisleInZone(request.aisleId(), zoneId);
        String code = normalizeCode(request.code());
        if (binRepository.existsByZone_IdAndCodeIgnoreCase(zoneId, code)) {
            throw new ConflictException("Bin code already exists in this zone: " + code);
        }
        Bin b = new Bin();
        b.setZone(zone);
        b.setAisle(aisle);
        b.setCode(code);
        b.setDescription(trimToNull(request.description()));
        b.setActive(request.active() == null || request.active());
        return MasterDataMapper.toResponse(binRepository.save(b));
    }

    @Transactional
    public BinResponse update(Long id, BinRequest request) {
        Bin b = binRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bin not found: " + id));
        String code = normalizeCode(request.code());
        Long zid = b.getZone().getId();
        if (!code.equalsIgnoreCase(b.getCode())) {
            if (binRepository.existsByZone_IdAndCodeIgnoreCase(zid, code)) {
                throw new ConflictException("Bin code already exists in this zone: " + code);
            }
        }
        b.setCode(code);
        b.setDescription(trimToNull(request.description()));
        if (request.aisleId() != null) {
            b.setAisle(ensureAisleInZone(request.aisleId(), zid));
        } else {
            b.setAisle(null);
        }
        if (request.active() != null) {
            b.setActive(request.active());
        }
        return MasterDataMapper.toResponse(binRepository.save(b));
    }

    @Transactional
    public void delete(Long id) {
        if (!binRepository.existsById(id)) {
            throw new ResourceNotFoundException("Bin not found: " + id);
        }
        binRepository.deleteById(id);
    }

    private Zone ensureZone(Long zoneId) {
        return zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found: " + zoneId));
    }

    private Aisle ensureAisleInZone(Long aisleId, Long zoneId) {
        Aisle a = aisleRepository.findById(aisleId)
                .orElseThrow(() -> new ResourceNotFoundException("Aisle not found: " + aisleId));
        if (!a.getZone().getId().equals(zoneId)) {
            throw new ConflictException("Aisle is not in the given zone");
        }
        return a;
    }

    private static void touchAssociations(Bin b) {
        b.getZone().getWarehouse().getId();
        if (b.getAisle() != null) {
            b.getAisle().getId();
        }
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
