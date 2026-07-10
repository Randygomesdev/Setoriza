package br.com.innkercode.auth.controller;

import br.com.innkercode.auth.domain.entity.User;
import br.com.innkercode.auth.domain.model.UserRole;
import br.com.innkercode.auth.dto.request.CreateUserRequest;
import br.com.innkercode.auth.dto.response.UserResponse;
import br.com.innkercode.auth.repository.UserRepository;
import br.com.innkercode.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthService authService;

    @InjectMocks
    private UserController userController;

    @Test
    void testCreateUser_AdminCannotCreateMaster() {
        User currentUser = User.builder().role(UserRole.ADMIN).build();
        CreateUserRequest request = new CreateUserRequest("New Master", "master@test.com", "password", UserRole.MASTER, "FISCAL");

        ResponseEntity<UserResponse> response = userController.createUser(request, currentUser);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verifyNoInteractions(authService);
    }

    @Test
    void testCreateUser_AdminCanCreateUser() {
        User currentUser = User.builder().role(UserRole.ADMIN).build();
        CreateUserRequest request = new CreateUserRequest("New User", "user@test.com", "password", UserRole.USER, "FISCAL");
        UserResponse mockResponse = new UserResponse(null, "New User", "user@test.com", null, "USER", "FISCAL");
        
        when(authService.createUser(request)).thenReturn(mockResponse);

        ResponseEntity<UserResponse> response = userController.createUser(request, currentUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(mockResponse, response.getBody());
    }

    @Test
    void testCreateUser_MasterCanCreateMaster() {
        User currentUser = User.builder().role(UserRole.MASTER).build();
        CreateUserRequest request = new CreateUserRequest("New Master", "master@test.com", "password", UserRole.MASTER, "FISCAL");
        UserResponse mockResponse = new UserResponse(null, "New Master", "master@test.com", null, "MASTER", "FISCAL");
        
        when(authService.createUser(request)).thenReturn(mockResponse);

        ResponseEntity<UserResponse> response = userController.createUser(request, currentUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(mockResponse, response.getBody());
    }

    @Test
    void testGetAll_AdminCannotSeeMaster() {
        // Arrange
        User currentUser = User.builder().role(UserRole.ADMIN).build();
        User masterUser = User.builder().name("Master").role(UserRole.MASTER).build();
        User adminUser = User.builder().name("Admin").role(UserRole.ADMIN).build();
        User normalUser = User.builder().name("User").role(UserRole.USER).build();

        when(userRepository.findAll()).thenReturn(List.of(masterUser, adminUser, normalUser));

        // Act
        ResponseEntity<List<UserResponse>> response = userController.getAll(currentUser);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<UserResponse> body = response.getBody();
        assertNotNull(body);
        assertEquals(2, body.size());
        assertTrue(body.stream().noneMatch(u -> "MASTER".equals(u.role())));
    }

    @Test
    void testGetAll_MasterCanSeeAll() {
        // Arrange
        User currentUser = User.builder().role(UserRole.MASTER).build();
        User masterUser = User.builder().name("Master").role(UserRole.MASTER).build();
        User adminUser = User.builder().name("Admin").role(UserRole.ADMIN).build();
        User normalUser = User.builder().name("User").role(UserRole.USER).build();

        when(userRepository.findAll()).thenReturn(List.of(masterUser, adminUser, normalUser));

        // Act
        ResponseEntity<List<UserResponse>> response = userController.getAll(currentUser);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<UserResponse> body = response.getBody();
        assertNotNull(body);
        assertEquals(3, body.size());
    }
}
