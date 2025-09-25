"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = requireSuperAdmin;
function requireSuperAdmin(req, res, next) {
    const user = req.user;
    if (!user || !user.is_super_admin) {
        return res.status(403).json({ message: "Forbidden: Super admin only" });
    }
    next();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VwZXItYWRtaW4tbWlkZGxld2FyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9taWRkbGV3YXJlL3N1cGVyLWFkbWluLW1pZGRsZXdhcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQSw4Q0FRQztBQVJELFNBQWdCLGlCQUFpQixDQUFDLEdBQVksRUFBRSxHQUFhLEVBQUUsSUFBa0I7SUFDL0UsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQTtJQUVyQixJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxJQUFJLEVBQUUsQ0FBQTtBQUNSLENBQUMifQ==