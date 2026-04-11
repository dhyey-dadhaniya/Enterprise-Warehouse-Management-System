package com.infotact.wms.security;

import com.infotact.wms.auth.Role;
import com.infotact.wms.auth.RoleRepository;
import com.infotact.wms.auth.User;
import com.infotact.wms.auth.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@Profile("!test")
@Order(2)
public class OperatorUserInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public OperatorUserInitializer(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername("operator")) {
            return;
        }
        Role operatorRole = roleRepository.findByName("OPERATOR")
                .orElseThrow(() -> new IllegalStateException("OPERATOR role missing; check Flyway V14"));
        User operator = new User();
        operator.setUsername("operator");
        operator.setPasswordHash(passwordEncoder.encode("op123"));
        operator.setEnabled(true);
        operator.setRoles(Set.of(operatorRole));
        userRepository.save(operator);
    }
}
