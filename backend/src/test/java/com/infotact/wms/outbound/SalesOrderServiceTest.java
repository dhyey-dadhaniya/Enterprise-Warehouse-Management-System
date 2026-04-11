package com.infotact.wms.outbound;

import com.infotact.wms.auth.UserRepository;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.inventory.InventoryBalanceRepository;
import com.infotact.wms.inventory.InventoryLedgerRepository;
import com.infotact.wms.master.ItemRepository;
import com.infotact.wms.master.WarehouseRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SalesOrderServiceTest {

    @Mock
    SalesOrderRepository salesOrderRepository;
    @Mock
    WarehouseRepository warehouseRepository;
    @Mock
    ItemRepository itemRepository;
    @Mock
    InventoryBalanceRepository inventoryBalanceRepository;
    @Mock
    PickTaskRepository pickTaskRepository;
    @Mock
    InventoryLedgerRepository inventoryLedgerRepository;
    @Mock
    UserRepository userRepository;
    @Mock
    SalesOrderPackIdempotencyRepository salesOrderPackIdempotencyRepository;

    @InjectMocks
    SalesOrderService salesOrderService;

    @Test
    void ship_whenOrderNotPacked_throwsConflict() {
        SalesOrder order = new SalesOrder();
        order.setStatus(SalesOrderStatus.PENDING);
        when(salesOrderRepository.findById(9L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> salesOrderService.ship(9L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("PACKED");

        verify(salesOrderRepository).findById(9L);
        verifyNoMoreInteractions(salesOrderRepository);
    }
}
