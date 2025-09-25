import { Request, Response, NextFunction } from "express"

export async function superAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = req.user

  if (!user || !user.is_super_admin) {
    return res.status(403).json({ message: "Super admin only" })
  }

  next()
}
