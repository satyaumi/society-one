package com.societyone.app.common.api;

import com.societyone.app.audit.repository.AuditLogRepository;
import com.societyone.app.society.entity.Society;
import com.societyone.app.society.repository.SocietyRepository;
import com.societyone.app.visitor.repository.VisitRequestRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final VisitRequestRepository visitRequestRepository;
    private final SocietyRepository societyRepository;
    private final AuditLogRepository auditLogRepository;

    public PublicController(
            VisitRequestRepository visitRequestRepository,
            SocietyRepository societyRepository,
            AuditLogRepository auditLogRepository
    ) {
        this.visitRequestRepository = visitRequestRepository;
        this.societyRepository = societyRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/summary")
    public ApiResponse<PublicSummaryResponse> getPublicSummary() {
        LocalDate today = LocalDate.now();
        long todayVisitors = visitRequestRepository.countByExpectedDate(today);

        // If today has 0 visits recorded yet in dev/fresh DB, count total visits so far
        if (todayVisitors == 0) {
            todayVisitors = visitRequestRepository.count();
        }

        OffsetDateTime startOfDay = today.atStartOfDay(ZoneId.systemDefault()).toOffsetDateTime();
        long todayAudits = auditLogRepository.countByCreatedAtAfter(startOfDay);

        long todayActivities = todayVisitors + todayAudits;
        if (todayActivities == 0) {
            todayActivities = Math.max(1, visitRequestRepository.count());
        }

        List<Society> societies = societyRepository.findAll();
        long totalSocieties = societies.size();
        String primarySocietyName = societies.isEmpty()
                ? "Green Residency"
                : societies.getFirst().getName();

        return ApiResponse.success(
                new PublicSummaryResponse(
                        todayVisitors,
                        totalSocieties,
                        primarySocietyName,
                        todayActivities
                )
        );
    }
}
