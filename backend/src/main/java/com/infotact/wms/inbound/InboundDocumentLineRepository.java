package com.infotact.wms.inbound;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InboundDocumentLineRepository extends JpaRepository<InboundDocumentLine, Long> {

    List<InboundDocumentLine> findByDocument_IdOrderByLineNumberAsc(Long documentId);

    Optional<InboundDocumentLine> findByIdAndDocument_Id(Long lineId, Long documentId);

    int countByDocument_Id(Long documentId);
}
