package com.societyone.app.society.controller;

import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.society.dto.SocietyCreationRequestResponse;
import com.societyone.app.society.dto.SocietyCreationSubmitRequest;
import com.societyone.app.society.service.SocietyCreationRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/public/society-requests")
public class PublicSocietyRequestController {

    private final SocietyCreationRequestService requestService;

    public PublicSocietyRequestController(SocietyCreationRequestService requestService) {
        this.requestService = requestService;
    }

    /**
     * Public submission of a new Society Creation Request (JSON).
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SocietyCreationRequestResponse> submitJson(
            @Valid @RequestBody SocietyCreationSubmitRequest request
    ) {
        SocietyCreationRequestResponse response = requestService.submitRequest(request, null);
        return ApiResponse.success(response, "Your society creation request has been submitted successfully!");
    }

    /**
     * Public submission with optional document upload (multipart/form-data).
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SocietyCreationRequestResponse> submitMultipart(
            @Valid @RequestPart("data") SocietyCreationSubmitRequest request,
            @RequestPart(value = "document", required = false) MultipartFile document
    ) {
        SocietyCreationRequestResponse response = requestService.submitRequest(request, document);
        return ApiResponse.success(response, "Your society creation request has been submitted successfully!");
    }

    /**
     * Public tracking of society creation applications by reference code, email, or phone.
     */
    @GetMapping("/track")
    public ApiResponse<List<SocietyCreationRequestResponse>> track(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String referenceCode,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone
    ) {
        String searchQuery = query;
        if (searchQuery == null || searchQuery.isBlank()) {
            searchQuery = referenceCode != null && !referenceCode.isBlank() ? referenceCode : (email != null && !email.isBlank() ? email : phone);
        }
        return ApiResponse.success(requestService.trackRequest(searchQuery));
    }

    /**
     * Public update / resubmission of an existing Society Creation Request (JSON).
     */
    @PutMapping(value = "/{referenceCode}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<SocietyCreationRequestResponse> updateJson(
            @PathVariable String referenceCode,
            @Valid @RequestBody SocietyCreationSubmitRequest request
    ) {
        SocietyCreationRequestResponse response = requestService.resubmitRequestByApplicant(referenceCode, request, null);
        return ApiResponse.success(response, "Your society creation request has been updated and resubmitted successfully!");
    }

    /**
     * Public update / resubmission with optional document upload (multipart/form-data).
     */
    @PutMapping(value = "/{referenceCode}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<SocietyCreationRequestResponse> updateMultipart(
            @PathVariable String referenceCode,
            @Valid @RequestPart("data") SocietyCreationSubmitRequest request,
            @RequestPart(value = "document", required = false) MultipartFile document
    ) {
        SocietyCreationRequestResponse response = requestService.resubmitRequestByApplicant(referenceCode, request, document);
        return ApiResponse.success(response, "Your society creation request has been updated and resubmitted successfully!");
    }

    /**
     * POST alias for clients submitting multipart updates.
     */
    @PostMapping(value = "/{referenceCode}/resubmit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<SocietyCreationRequestResponse> resubmitMultipart(
            @PathVariable String referenceCode,
            @Valid @RequestPart("data") SocietyCreationSubmitRequest request,
            @RequestPart(value = "document", required = false) MultipartFile document
    ) {
        SocietyCreationRequestResponse response = requestService.resubmitRequestByApplicant(referenceCode, request, document);
        return ApiResponse.success(response, "Your society creation request has been updated and resubmitted successfully!");
    }

    @PostMapping(value = "/{referenceCode}/resubmit", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<SocietyCreationRequestResponse> resubmitJson(
            @PathVariable String referenceCode,
            @Valid @RequestBody SocietyCreationSubmitRequest request
    ) {
        SocietyCreationRequestResponse response = requestService.resubmitRequestByApplicant(referenceCode, request, null);
        return ApiResponse.success(response, "Your society creation request has been updated and resubmitted successfully!");
    }
}
