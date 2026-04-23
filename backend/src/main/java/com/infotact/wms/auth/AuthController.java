package com.infotact.wms.auth;

import com.infotact.wms.auth.dto.AuthResponse;
import com.infotact.wms.auth.dto.LoginRequest;
import com.infotact.wms.auth.dto.RegisterRequest;
import com.infotact.wms.auth.dto.RegisterResponse;
import com.infotact.wms.error.ConflictException;
import com.infotact.wms.security.JwtProperties;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import com.infotact.wms.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/auth")
@SecurityRequirements
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserDetailsService userDetailsService;

    public AuthController(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            JwtProperties jwtProperties,
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            UserDetailsService userDetailsService
    ) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        UserDetails principal = (UserDetails) auth.getPrincipal();
        String token = jwtService.generateToken(principal);
        return ResponseEntity.ok(new AuthResponse(token, "Bearer", jwtProperties.expirationMs()));
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new ConflictException("Username already exists");
        }

        String roleName = request.role().trim().toUpperCase();
        Set<String> allowed = Set.of("OPERATOR", "MANAGER", "RECEIVER", "PICKER");
        if (!allowed.contains(roleName)) {
            throw new ConflictException("Invalid role for self-register");
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ConflictException("Role not found: " + roleName));

        User user = new User();
        user.setUsername(request.username().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setEnabled(true);
        user.setRoles(Set.of(role));
        userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(RegisterResponse.created());
    }
}
