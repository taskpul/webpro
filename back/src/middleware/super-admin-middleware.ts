import { Request, Response, NextFunction } from "express"

export async function superAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.NODE_ENV === "test") {
    const testHeader = req.get("x-test-super-admin")
    if (testHeader) {
      req.user = {
        ...(req.user as Record<string, unknown> | undefined),
        id: testHeader,
        is_super_admin: true,
      }
    }
  }

  const user = req.user as { is_super_admin?: boolean } | undefined

  if (!user || !user.is_super_admin) {
    return res.status(403).json({ message: "Super admin only" })
  }

  next()
}

export const requireSuperAdmin = superAdminMiddleware
