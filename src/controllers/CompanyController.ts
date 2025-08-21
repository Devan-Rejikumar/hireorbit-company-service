import { Request, Response } from "express";
import { inject, injectable } from "inversify";
import TYPES from "../config/types";
import { ICompanyService } from "../services/ICompanyService";
import { HttpStatusCode, AuthStatusCode, OTPStatusCode, CompanyStatusCode, ValidationStatusCode } from '../enums/StatusCodes';

@injectable()
export class CompanyController {
  constructor(@inject(TYPES.ICompanyService) private companyService: ICompanyService) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      console.log("dddddddddddddd", req.body);
      const { email, password, companyName } = req.body;
      const company = await this.companyService.register(email, password, companyName);
      res.status(AuthStatusCode.COMPANY_REGISTRATION_SUCCESS).json({ company });
    } catch (err: any) {
      if (err.message === "Email already in use") {
        res.status(AuthStatusCode.EMAIL_ALREADY_EXISTS).json({ error: err.message });
      } else {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: err.message });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const { company, companyToken } = await this.companyService.login(email, password);
      res.cookie("companyToken", companyToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 1000,
      }).status(AuthStatusCode.COMPANY_LOGIN_SUCCESS).json({ company });
    } catch (err: any) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: err.message });
    }
  }

  async generateOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(OTPStatusCode.EMAIL_REQUIRED).json({ error: "Email is required" });
        return;
      }
      const result = await this.companyService.generateOTP(email);
      res.status(OTPStatusCode.OTP_GENERATED).json(result);
    } catch (err: any) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json({ error: err.message });
    }
  }

  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        res.status(OTPStatusCode.OTP_REQUIRED).json({ error: "Email and OTP are required" });
        return;
      }
      const result = await this.companyService.verifyOTP(email, parseInt(otp));
      res.status(OTPStatusCode.OTP_VERIFIED).json(result);
    } catch (err: any) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json({ error: err.message });
    }
  }

  async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(OTPStatusCode.EMAIL_REQUIRED).json({ error: "Email is required" });
        return;
      }
      const result = await this.companyService.resendOTP(email);
      res.status(OTPStatusCode.OTP_RESENT).json(result);
    } catch (err: any) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json({ error: err.message });
    }
  }

  // async getMe(req: Request, res: Response): Promise<void> {
  //   const company = (req as any).company;
  //   if (!company) {
  //     res.status(AuthStatusCode.COMPANY_NOT_AUTHENTICATED).json({ error: "Unauthorized" });
  //     return;
  //   }
  //   const { id, companyName, email } = company;
  //   res.status(HttpStatusCode.OK).json({ id, companyName, email });
  // }

  async getMe(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.headers['x-user-id'] as string;
    const email = req.headers['x-user-email'] as string;

    if (!companyId) {
      res.status(401).json({ error: "Company not authenticated" });
      return;
    }

    const company = await this.companyService.getCompanyProfile(companyId);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    res.status(200).json({ id: company.id, companyName: company.companyName, email: company.email });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}


  async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie("companyToken", { httpOnly: true, sameSite: "lax" });
    res.status(AuthStatusCode.COMPANY_LOGOUT_SUCCESS).json({ message: "Logged out successfully" });
  }

  async getAllCompanies(req: Request, res: Response): Promise<void> {
    try {
      const companies = await this.companyService.getAllCompanies();
      res.status(CompanyStatusCode.COMPANIES_RETRIEVED).json(companies);
    } catch (error) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch companies" });
    }
  }

  async blockCompany(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.companyService.blockCompany(id);
      res.status(CompanyStatusCode.COMPANY_BLOCKED).json({ message: "Company blocked successfully" });
    } catch (error) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: "Failed to block company" });
    }
  }

  async unblockCompany(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.companyService.unblockCompany(id);
      res.status(CompanyStatusCode.COMPANY_UNBLOCKED).json({ message: "Company unblocked successfully" });
    } catch (error) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: "Failed to unblock company" });
    }
  }

  async completeStep2(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.headers['x-user-id'] as string;
      const step2Data = req.body;
      if (!companyId) {
        res.status(AuthStatusCode.COMPANY_NOT_AUTHENTICATED).json({ error: "Company not authenticated" });
        return;
      }
      const company = await this.companyService.completeStep2(companyId, step2Data);
      res.status(CompanyStatusCode.STEP2_COMPLETED).json({ company, message: "Step 2 completed successfully" });
    } catch (error: any) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json({ error: error.message });
    }
  }

  async completeStep3(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.headers['x-user-id'] as string;
      const step3Data = req.body;
      if (!companyId) {
        res.status(AuthStatusCode.COMPANY_NOT_AUTHENTICATED).json({ error: "Company not authenticated" });
        return;
      }
      const company = await this.companyService.completeStep3(companyId, step3Data);
      res.status(CompanyStatusCode.STEP3_COMPLETED).json({
        company,
        message: "Profile completed! Submitted for admin review.",
      });
    } catch (error: any) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json({ error: error.message });
    }
  }

  async getCompanyProfile(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.headers['x-user-id'] as string;
      if (!companyId) {
        res.status(AuthStatusCode.COMPANY_NOT_AUTHENTICATED).json({ error: "Company not authenticated" });
        return;
      }
      const company = await this.companyService.getCompanyProfile(companyId);
      const profileStep = await this.companyService.getProfileStep(companyId);
      res.status(CompanyStatusCode.PROFILE_RETRIEVED).json({ company, profileStep });
    } catch (error: any) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  async getProfileStep(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.headers['x-user-id'] as string;
      if (!companyId) {
        res.status(AuthStatusCode.COMPANY_NOT_AUTHENTICATED).json({ error: "Company not authenticated" });
        return;
      }
      const company = await this.companyService.getCompanyProfile(companyId);
      if (company?.isVerified) {
        res.status(HttpStatusCode.OK).json({ profileStep: "approved" });
        return;
      }
      if (company?.rejectionReason) {
        res.status(HttpStatusCode.OK).json({ profileStep: "rejected" });
        return;
      }
      const profileStep = await this.companyService.getProfileStep(companyId);
      res.status(HttpStatusCode.OK).json({ profileStep });
    } catch (error: any) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  async getPendingCompanies(req: Request, res: Response): Promise<void> {
    try {
      const companies = await this.companyService.getPendingCompanies();
      res.status(CompanyStatusCode.PENDING_COMPANIES_RETRIEVED).json({ companies });
    } catch (error: any) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

async approveCompany(req: Request, res: Response): Promise<void> {
  try {
    const { id: companyId } = req.params;
    const adminId = req.headers['x-user-id'] as string;
    const adminRole = req.headers['x-user-role'] as string;
    
    if (!adminId || adminRole !== 'admin') {
      res.status(AuthStatusCode.ADMIN_NOT_AUTHENTICATED).json({ error: "Admin not authenticated" });
      return;
    }
    const company = await this.companyService.approveCompany(companyId, adminId);
    res.status(CompanyStatusCode.COMPANY_APPROVED).json({
      company,
      message: "Company approved successfully",
    });
  } catch (error: any) {
    res.status(ValidationStatusCode.VALIDATION_ERROR).json({ error: error.message });
  }
}
  async rejectCompany(req: Request, res: Response): Promise<void> {
    try {
      const { id: companyId } = req.params;
      const { reason } = req.body;
      const adminId = req.headers['x-user-id'] as string;
      const adminRole = req.headers['x-user-role'] as string;
      
      if (!adminId || adminRole !== 'admin') {
        res.status(AuthStatusCode.ADMIN_NOT_AUTHENTICATED).json({ error: "Admin not authenticated" });
        return;
      }
      if (!reason) {
        res.status(ValidationStatusCode.REJECTION_REASON_REQUIRED).json({ error: "Rejection reason is required" });
        return;
      }
      const company = await this.companyService.rejectCompany(companyId, reason, adminId);
      res.status(CompanyStatusCode.COMPANY_REJECTED).json({
        company,
        message: "Company rejected successfully",
      });
    } catch (error: any) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json({ error: error.message });
    }
  }

  async getAllCompaniesForAdmin(req: Request, res: Response): Promise<void> {
    try {
      const companies = await this.companyService.getAllCompaniesForAdmin();
      res.status(CompanyStatusCode.COMPANIES_RETRIEVED).json({ companies });
    } catch (error: any) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }

  async getCompanyDetailsForAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { id: companyId } = req.params;
      const adminId = req.headers['x-user-id'] as string;
      const adminRole = req.headers['x-user-role'] as string;
      
      if (!adminId || adminRole !== 'admin') {
        res.status(AuthStatusCode.ADMIN_NOT_AUTHENTICATED).json({ error: "Admin not authenticated" });
        return;
      }

      const company = await this.companyService.getCompanyDetailsForAdmin(companyId);
      res.status(HttpStatusCode.OK).json({ company });
    } catch (error: any) {
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({ error: error.message });
    }
  }
}
