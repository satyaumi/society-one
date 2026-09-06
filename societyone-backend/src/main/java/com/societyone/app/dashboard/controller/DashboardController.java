package com.societyone.app.dashboard.controller;

import com.societyone.app.auth.entity.User;
import com.societyone.app.common.api.ApiResponse;
import com.societyone.app.common.security.CurrentUser;
import com.societyone.app.dashboard.dto.DashboardSummaryResponse;
import com.societyone.app.dashboard.service.DashboardService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public ApiResponse<DashboardSummaryResponse> getSummary(
            Authentication authentication
    ) {
        User actor = CurrentUser.require(authentication);
        return ApiResponse.success(
                dashboardService.getSummary(actor),
                "Dashboard summary"
        );
    }
}
