# project_management/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from django.conf import settings

from authentication.views import (
    ProjectSubmissionView,
    TeacherDashboardView,
    StudentDashboardView,
    AIChatbotView,
    AIVivaView,
    AIVivaEvaluationView,
    ProjectArchiveView,
    AnalyticsView,
    LeaderboardView,
    AlumniPortalView,
    AllProjectsView,
    AdminDashboardView,
    AppointedTeacherDashboard,
    UnappointedTeacherDashboard,
    ProjectLogUpdateView,
    ProjectProgressLogListView,
    ProjectProgressView,
    TopAlumniProjectsView,
    ApprovedProjectsView,
    ProjectMessagesView,
    ProjectVivaListView,
    ProjectInquiryView,
    AdminGroupManagementView, 
    AdminUserRoleView
)

urlpatterns = [
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/dashboard/groups/<int:group_id>/manage-users/', AdminGroupManagementView.as_view(), name='admin-manage-group-users'),
    path('admin/dashboard/users/<int:user_id>/update-role/', AdminUserRoleView.as_view(), name='admin-update-user-role'),
    # Admin
    path('admin/', admin.site.urls),
    
    # Authentication
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    
    # Project submission
    path('projects/submit/', ProjectSubmissionView.as_view(), name='project-submit'),

    # Teacher dashboard
    path('teacher/submissions/', TeacherDashboardView.as_view(), name='teacher-submissions'),
    path('teacher/submissions/<int:submission_id>/', TeacherDashboardView.as_view(), name='teacher-submission-detail'),
    path('teacher/projects/<int:project_id>/viva-history/', ProjectVivaListView.as_view(), name='teacher-viva-history'),
    
    # Student dashboard
    path('student/submissions/', StudentDashboardView.as_view(), name='student-submissions'),
    
    # AI features
    path('ai/chat/', AIChatbotView.as_view(), name='ai-chat'),
    path('ai/viva/', AIVivaView.as_view(), name='ai-viva'),
    path('ai/viva/evaluate/', AIVivaEvaluationView.as_view(), name='ai-viva-evaluate'),
    path('ai/project-inquiry/', ProjectInquiryView.as_view(), name='ai-project-inquiry'),
    
    # Project archive
    path('projects/archive/<int:project_id>/', ProjectArchiveView.as_view(), name='project-archive'),
    
    # Analytics & leaderboard
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    
    # Alumni portal
    path('alumni/my-projects/', AlumniPortalView.as_view(), name='alumni-my-projects'),
    path('alumni/top-projects/', TopAlumniProjectsView.as_view(), name='alumni-top-projects'),
    
    # All projects
    path('projects/all/', AllProjectsView.as_view(), name='projects-all'),
    
    # Admin dashboard
    
    
    # Teacher appointment dashboards
    path('teacher/appointed/', AppointedTeacherDashboard.as_view(), name='teacher-appointed-submissions'),
    path('teacher/unappointed/', UnappointedTeacherDashboard.as_view(), name='teacher-unappointed-submissions'),
    path('teacher/approved-projects/', ApprovedProjectsView.as_view(), name='teacher-approved-projects'),

    # Project progress routes
    path('projects/progress/<int:project_id>/', ProjectProgressView.as_view(), name='project-progress-detail'),
    path('projects/<int:project_id>/log-update/', ProjectLogUpdateView.as_view(), name='project-log-update'),

    # NEW PATH FOR TEACHER (ADD THIS):
    path('projects/<int:project_id>/progress-logs/', ProjectProgressLogListView.as_view(), name='project-progress-logs'),
    
    path('projects/<int:project_id>/messages/', ProjectMessagesView.as_view(), name='project-messages'),
      #
   # path('projects/progress/update/<int:submission_id>/', ProgressUpdateView.as_view(), name='project-progress-update'),  # PATCH update progress
    path('projects/<int:project_id>/messages/', ProjectMessagesView.as_view(), name='project-messages'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
