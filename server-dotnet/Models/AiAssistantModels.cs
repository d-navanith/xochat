namespace Xochat.Models;

public class TeamMemberProfileDto
{
    public string Username { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public bool IsOnline { get; set; }
    public string Shift { get; set; } = string.Empty;
    public string Timezone { get; set; } = "EST (UTC-5)";
    public string JoinDate { get; set; } = "October 2026";
    public List<string> Specializations { get; set; } = new();
}

public class TeamMemberDutyDto
{
    public string Summary { get; set; } = string.Empty;
    public List<string> PrimaryDuties { get; set; } = new();
    public List<string> ScopedChannels { get; set; } = new();
    public string OperationalStatus { get; set; } = string.Empty;
}

public class MonthlyMessageStatDto
{
    public string Month { get; set; } = string.Empty;
    public int Count { get; set; }
    public int Target { get; set; } = 300;
}

public class MessageCountsDto
{
    public int TodayCount { get; set; }
    public int ThisMonthCount { get; set; }
    public int LastMonthCount { get; set; }
    public int YearToDateCount { get; set; }
    public List<MonthlyMessageStatDto> MonthlyBreakdown { get; set; } = new();
}

public class PerformanceMetricsDto
{
    public int AverageLatencySeconds { get; set; }
    public double SingleReplyComplianceRate { get; set; } = 100.0;
    public double ResolutionRate { get; set; } = 96.5;
    public int CollisionLocksPrevented { get; set; }
    public int FastRepliesCount { get; set; }
    public double SlaAdherencePercent { get; set; } = 98.4;
    public double RatingScore { get; set; } = 4.9;
    public string VelocityBadge { get; set; } = "High Velocity Responder";
}

public class GoalProgressDto
{
    public string Category { get; set; } = string.Empty;
    public double CurrentAmount { get; set; }
    public double TargetAmount { get; set; }
    public double Percentage => TargetAmount > 0 ? Math.Round((CurrentAmount / TargetAmount) * 100.0, 1) : 0;
}

public class DealRevenueForecastDto
{
    public double CompanyGoalTarget { get; set; } = 300000;
    public double CompanyGoalCurrent { get; set; } = 234160;
    public double CompanyGoalPercentage => Math.Round((CompanyGoalCurrent / CompanyGoalTarget) * 100.0, 1);
    public string GoalPeriod { get; set; } = "February Goals";
    public List<GoalProgressDto> TeamGoals { get; set; } = new();
}

public class PipelineStageDealDto
{
    public string Stage { get; set; } = string.Empty;
    public double Amount { get; set; }
    public int DealsCount { get; set; }
    public string BadgeColor { get; set; } = string.Empty;
}

public class SalesPipelineDto
{
    public double TotalAmount { get; set; } = 1195500;
    public int TotalDeals { get; set; } = 89;
    public string Period { get; set; } = "This month";
    public List<PipelineStageDealDto> Stages { get; set; } = new();
}

public class AmountByStageDto
{
    public double TotalAmount { get; set; } = 1195500;
    public string Period { get; set; } = "This month";
    public List<PipelineStageDealDto> Stages { get; set; } = new();
}

public class PerformancePointDto
{
    public string Date { get; set; } = string.Empty;
    public int Open { get; set; }
    public int Replied { get; set; }
    public int Clicked { get; set; }
}

public class ResponsePerformanceReportDto
{
    public string Title { get; set; } = "Email Peformance Report";
    public List<PerformancePointDto> Timeline { get; set; } = new();
}

public class HandledClientDto
{
    public string ConversationId { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerAvatar { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string InquiryText { get; set; } = string.Empty;
    public string AgentReplyText { get; set; } = string.Empty;
    public int ResponseLatencySeconds { get; set; }
    public string DateStr { get; set; } = string.Empty;
    public string Stage { get; set; } = string.Empty;
    public decimal DealValue { get; set; }
    public string Timestamp { get; set; } = string.Empty;
}

public class TeamMemberDossierDto
{
    public TeamMemberProfileDto Profile { get; set; } = new();
    public TeamMemberDutyDto WhatHeDoes { get; set; } = new();
    public MessageCountsDto MessageCounts { get; set; } = new();
    public PerformanceMetricsDto Performance { get; set; } = new();
    public DealRevenueForecastDto DealRevenueForecast { get; set; } = new();
    public SalesPipelineDto SalesPipeline { get; set; } = new();
    public AmountByStageDto AmountByStage { get; set; } = new();
    public ResponsePerformanceReportDto ResponsePerformanceReport { get; set; } = new();
    public List<HandledClientDto> HandledClients { get; set; } = new();
}

public class AiAssistantQueryRequest
{
    public string Query { get; set; } = string.Empty;
    public string? SelectedUsername { get; set; }
}

public class AiAssistantQueryResponse
{
    public string AnswerText { get; set; } = string.Empty;
    public string TargetUsername { get; set; } = string.Empty;
    public bool Found { get; set; }
    public TeamMemberDossierDto? Dossier { get; set; }
    public List<string> SuggestedFollowUps { get; set; } = new();
}
