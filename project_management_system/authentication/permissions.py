from rest_framework import permissions
from .models import Project, Team
class IsTeacherOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow only 'Teacher' or 'HOD/Admin' users to access a view.
    """
    def has_permission(self, request, view):
        # Allow read-only access for anyone (GET requests) but restrict POST/PATCH/DELETE
        # For this view, we'll require a specific role for all methods
        return request.user.role in ['Teacher', 'HOD/Admin']
class IsProjectMemberOrTeacher(permissions.BasePermission):
    """
    Allows access only to:
    - Members of the project team (students).
    - Teachers assigned to the group associated with the project.
    """
    def has_permission(self, request, view):
        # This check requires the object, so we implement has_object_permission
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Determine the project instance based on the object type
        if isinstance(obj, Project):
            project = obj
        elif hasattr(obj, 'project'): # For models like Message linked to Project
             project = obj.project
        else:
             return False # Cannot determine project context

        # Check if the user is in the project's team (student)
        try:
            if user in project.team.members.all():
                return True
        except Team.DoesNotExist:
             # Handle case where team might not exist yet (shouldn't happen for messages)
             pass 

        # Check if the user is a teacher assigned to the project's group
        try:
            if project.submission and project.submission.group:
                 if user in project.submission.group.teachers.all():
                      return True
        except AttributeError:
             # Handle potential missing submission or group links
             pass

        return False