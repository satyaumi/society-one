package com.societyone.app.visitor.controller;

import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.visitor.dto.VisitRequestResponse;
import com.societyone.app.visitor.dto.VisitorAuthorizationRequest;
import com.societyone.app.visitor.dto.VisitorAuthorizationResponse;
import com.societyone.app.visitor.entity.AuthorizationStatus;
import com.societyone.app.visitor.service.VisitorAuthorizationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/visitor-authorizations")
public class VisitorAuthorizationController {

    private final VisitorAuthorizationService authorizationService;

    public VisitorAuthorizationController(VisitorAuthorizationService authorizationService) {
        this.authorizationService = authorizationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<VisitorAuthorizationResponse> createAuthorization(
            Authentication authentication,
            @Valid @RequestBody VisitorAuthorizationRequest request
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(authorizationService.createOrAddAuthorization(actor, request));
    }

    @GetMapping
    public ApiResponse<List<VisitorAuthorizationResponse>> listAuthorizations(
            Authentication authentication,
            @RequestParam(required = false) String query
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(authorizationService.listAuthorizations(actor, query));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<VisitorAuthorizationResponse> updateStatus(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam AuthorizationStatus status
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(authorizationService.updateStatus(actor, id, status));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAuthorization(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User actor = CurrentUser.require(authentication);
        authorizationService.deleteAuthorization(actor, id);
    }

    @PostMapping("/{id}/check-in")
    public ApiResponse<VisitRequestResponse> checkIn(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(authorizationService.checkInRegularVisitor(actor, id));
    }
}
