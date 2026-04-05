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
        Role receiver = roleRepository.findByName("RECEIVER")
                .orElseThrow(() -> new IllegalStateException("RECEIVER role missing"));
        Role picker = roleRepository.findByName("PICKER")
                .orElseThrow(() -> new IllegalStateException("PICKER role missing"));

        if (!userRepository.existsByUsername("receiver")) {
            User u = new User();
            u.setUsername("receiver");
            u.setPasswordHash(passwordEncoder.encode("recv123"));
            u.setEnabled(true);
            u.setRoles(Set.of(receiver));
            userRepository.save(u);
        }
        if (!userRepository.existsByUsername("picker")) {
            User u = new User();
            u.setUsername("picker");
            u.setPasswordHash(passwordEncoder.encode("pick123"));
            u.setEnabled(true);
            u.setRoles(Set.of(picker));
            userRepository.save(u);
        }
    }
}
