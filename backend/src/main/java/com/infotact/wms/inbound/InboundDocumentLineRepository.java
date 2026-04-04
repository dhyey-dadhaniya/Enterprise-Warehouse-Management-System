package com.infotact.wms.inbound;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InboundDocumentLineRepository extends JpaRepository<InboundDocumentLine, Long> {

    List<InboundDocumentLine> findByDocument_IdOrderByLineNumberAsc(Long documentId);

    Optional<InboundDocumentLine> findByIdAndDocument_Id(Long lineId, Long documentId);

    int countByDocument_Id(Long documentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT l FROM InboundDocumentLine l
            JOIN FETCH l.document d
            JOIN FETCH d.warehouse
            JOIN FETCH l.item
            WHERE l.id = :lineId AND d.id = :documentId
            """)
    Optional<InboundDocumentLine> findForUpdate(@Param("lineId") Long lineId, @Param("documentId") Long documentId);
}
