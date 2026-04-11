package com.infotact.wms.inbound;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InboundDocumentRepository extends JpaRepository<InboundDocument, Long>, JpaSpecificationExecutor<InboundDocument> {

    Optional<InboundDocument> findByDocumentNumberIgnoreCase(String documentNumber);

    boolean existsByDocumentNumberIgnoreCase(String documentNumber);

    @Query("""
            SELECT DISTINCT d FROM InboundDocument d
            JOIN FETCH d.warehouse w
            LEFT JOIN FETCH d.lines l
            LEFT JOIN FETCH l.item
            WHERE d.id = :id
            """)
    Optional<InboundDocument> findDetailById(@Param("id") Long id);
}
