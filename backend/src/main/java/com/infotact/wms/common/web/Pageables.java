package com.infotact.wms.common.web;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class Pageables {

    private Pageables() {
    }

    /**
     * Uses {@code defaultSort} when the request did not specify {@code sort} params.
     */
    public static Pageable withDefaultSort(Pageable pageable, Sort defaultSort) {
        if (pageable.isUnpaged()) {
            return pageable;
        }
        if (pageable.getSort().isSorted()) {
            return pageable;
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), defaultSort);
    }
}
