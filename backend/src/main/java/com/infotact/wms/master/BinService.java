package com.infotact.wms.master;

import com.infotact.wms.error.ConflictException;
import com.infotact.wms.error.ResourceNotFoundException;
import com.infotact.wms.master.dto.BinRequest;
import com.infotact.wms.master.dto.BinResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class BinService {

    private final ZoneRepository zoneRepository;
    private final BinRepository binRepository;

    public BinService(ZoneRepository zoneRepository, BinRepository binRepository) {
        this.zoneRepository = zoneRepository;
        this.binRepository = binRepository;
    }

    @Transactional(readOnly = true)
    public List<BinResponse> listByZone(Long zoneId) {
        ensureZone(zoneId);
        return binRepository.findByZone_IdOrderByCodeAsc(zoneId).stream()
                .map(MasterDataMapper::toResponse)
                .toList();
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
        String code = normalizeCode(request.code());
        if (binRepository.existsByZone_IdAndCodeIgnoreCase(zoneId, code)) {
            throw new ConflictException("Bin code already exists in this zone: " + code);
        }
        Bin b = new Bin();
        b.setZone(zone);
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

    private static void touchAssociations(Bin b) {
        b.getZone().getWarehouse().getId();
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
