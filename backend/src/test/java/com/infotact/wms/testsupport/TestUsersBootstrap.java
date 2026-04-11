package com.infotact.wms.testsupport;

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
@Profile("test")
@Order(2)
public class TestUsersBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public TestUsersBootstrap(
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
        Role operator = roleRepository.findByName("OPERATOR")
                .orElseThrow(() -> new IllegalStateException("OPERATOR role missing; check Flyway V14"));

        if (!userRepository.existsByUsername("operator")) {
            User u = new User();
            u.setUsername("operator");
            u.setPasswordHash(passwordEncoder.encode("op123"));
            u.setEnabled(true);
            u.setRoles(Set.of(operator));
            userRepository.save(u);
        }
    }
}
