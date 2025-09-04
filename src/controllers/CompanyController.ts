import { Request, Response } from "express";
import { inject, injectable } from "inversify";
import TYPES from "../config/types";
import { ICompanyService } from "../services/ICompanyService";
import { HttpStatusCode, AuthStatusCode, OTPStatusCode, CompanyStatusCode, ValidationStatusCode } from '../enums/StatusCodes';
import { CompanyGenerateOTPSchema, CompanyLoginSchema, CompanyProfileSchema, CompanyRegisterSchema, CompanyStep2Schema, CompanyStep3Schema, CompanyVerifyOTPSchema, RejectCompanySchema } from "../dto/schemas/company.schema";
import { buildErrorResponse, buildSuccessResponse } from "shared-dto";

@injectable()
export class CompanyController {
  constructor(@inject(TYPES.ICompanyService) private companyService: ICompanyService) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = CompanyRegisterSchema.safeParse(req.body);
      if(!validationResult.success){
        res.status(ValidationStatusCode.VALIDATION_ERROR).json(buildErrorResponse('Validation failed', validationResult.error.message))
        return;
      }
      const { email, password, companyName } = validationResult.data;
      const company = await this.companyService.register(email, password, companyName);
      res.status(AuthStatusCode.COMPANY_REGISTRATION_SUCCESS).json(buildSuccessResponse(company,'Company Registered successfully'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (errorMessage === "Email already in use") {
        res.status(AuthStatusCode.EMAIL_ALREADY_EXISTS).json(buildErrorResponse(errorMessage,'Company registeration failed'));
      } else {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(buildErrorResponse(errorMessage,'Company registeration failed'));
      }
    }
  }

async login(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = CompanyLoginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json(
        buildErrorResponse('Validation failed', validationResult.error.message)
      );
      return;
    }
    const { email, password } = validationResult.data;
    const result = await this.companyService.login(email, password);
    res.cookie("companyAccessToken", result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000,  
    });
    
    res.cookie("companyRefreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,  
    });
    res.status(AuthStatusCode.COMPANY_LOGIN_SUCCESS).json(
      buildSuccessResponse({ company: result.company }, 'Company login successful')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      buildErrorResponse(errorMessage, 'Company login failed')
    );
  }
}

async refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken: string | undefined = req.cookies.companyRefreshToken;
    
    if (!refreshToken) {
      res.status(HttpStatusCode.UNAUTHORIZED).json(buildErrorResponse('No refresh token','Authentication required'));
      return;
    }

    const result = await this.companyService.refreshToken(refreshToken);
    
    res.cookie("companyAccessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000,
    });
    
    res.status(HttpStatusCode.OK).json(buildSuccessResponse(null,'Token refreshed successfully'));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    res.status(HttpStatusCode.UNAUTHORIZED).json(buildErrorResponse(errorMessage,'Token refresh failed'))
  }
}
async generateOTP(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = CompanyGenerateOTPSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json(
        buildErrorResponse('Validation failed', validationResult.error.message)
      );
      return;
    }
    const { email } = validationResult.data;
    const result = await this.companyService.generateOTP(email);
    res.status(OTPStatusCode.OTP_GENERATED).json(
      buildSuccessResponse(result, 'OTP generated successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(ValidationStatusCode.VALIDATION_ERROR).json(
      buildErrorResponse(errorMessage, 'OTP generation failed')
    );
  }
}

async verifyOTP(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = CompanyVerifyOTPSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(OTPStatusCode.OTP_REQUIRED).json(
        buildErrorResponse('Validation failed', validationResult.error.message)
      );
      return;
    }
    const { email, otp } = validationResult.data;
    const result = await this.companyService.verifyOTP(email, parseInt(otp));
    res.status(OTPStatusCode.OTP_VERIFIED).json(
      buildSuccessResponse(result, 'OTP verified successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(OTPStatusCode.OTP_INVALID).json(
      buildErrorResponse(errorMessage, 'OTP verification failed')
    );
  }
}

  async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = CompanyGenerateOTPSchema.safeParse(req.body);
      if(!validationResult.success){
        res.status(OTPStatusCode.EMAIL_REQUIRED).json(buildErrorResponse('Validation failed', validationResult.error.message));
        return;
      }
      const { email } = validationResult.data;
      const result = await this.companyService.resendOTP(email);
      res.status(OTPStatusCode.OTP_RESENT).json(buildSuccessResponse(result,'OTP resent successfully'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      res.status(ValidationStatusCode.VALIDATION_ERROR).json(buildErrorResponse(errorMessage,'OTP resend failed'));
    }
  }


  async getMe(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.headers['x-user-id'] as string;
    const email = req.headers['x-user-email'] as string;

    if (!companyId) {
      res.status(401).json(buildErrorResponse('Company not authenticated','Authentication required'));
      return;
    }

    const company = await this.companyService.getCompanyProfile(companyId);
    if (!company) {
      res.status(404).json(buildErrorResponse('Company not found','Company profile not found'));
      return;
    }

    res.status(200).json(buildSuccessResponse({id: company.id,companyName:company.companyName,email:company.email},'Company profile retrieved successfully'));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(buildErrorResponse(errorMessage,'Failed to retrieve company profile'))
  }
}

async logout(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies.companyRefreshToken;
    
    if (refreshToken) {
      await this.companyService.logoutWithToken(refreshToken);
    }
    res.clearCookie("companyAccessToken", { 
      httpOnly: true, 
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
    
    res.clearCookie("companyRefreshToken", { 
      httpOnly: true, 
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
    
    res.status(HttpStatusCode.OK).json(buildSuccessResponse(null,'Logged out successfully'));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(buildErrorResponse(errorMessage,'Logout failed'));
  }
}


async getAllCompanies(req: Request, res: Response): Promise<void> {
  try {
    const companies = await this.companyService.getAllCompanies();
    res.status(CompanyStatusCode.COMPANIES_RETRIEVED).json(
      buildSuccessResponse({ companies }, 'Companies retrieved successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      buildErrorResponse(errorMessage, 'Failed to fetch companies')
    );
  }
}

async blockCompany(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json(
        buildErrorResponse('Company ID is required', 'Validation failed')
      );
      return;
    }
    await this.companyService.blockCompany(id);
    res.status(CompanyStatusCode.COMPANY_BLOCKED).json(
      buildSuccessResponse(null, 'Company blocked successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      buildErrorResponse(errorMessage, 'Failed to block company')
    );
  }
}

async unblockCompany(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params; 
    if (!id) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json(
        buildErrorResponse('Company ID is required', 'Validation failed')
      );
      return;
    }
    await this.companyService.unblockCompany(id);
    res.status(CompanyStatusCode.COMPANY_UNBLOCKED).json(
      buildSuccessResponse(null, 'Company unblocked successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      buildErrorResponse(errorMessage, 'Failed to unblock company')
    );
  }
}

async completeStep2(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = CompanyStep2Schema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json(
        buildErrorResponse('Validation failed', validationResult.error.message)
      );
      return;
    }
    const companyId = req.headers['x-user-id'] as string;
    const step2Data = validationResult.data;
    
    if (!companyId) {
      res.status(AuthStatusCode.COMPANY_NOT_AUTHENTICATED).json(
        buildErrorResponse('Company not authenticated', 'Authentication required')
      );
      return;
    }
    
    const company = await this.companyService.completeStep2(companyId, step2Data);
    res.status(CompanyStatusCode.STEP2_COMPLETED).json(
      buildSuccessResponse({ company }, 'Step 2 completed successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(ValidationStatusCode.VALIDATION_ERROR).json(
      buildErrorResponse(errorMessage, 'Step 2 completion failed')
    );
  }
}

async completeStep3(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = CompanyStep3Schema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(ValidationStatusCode.VALIDATION_ERROR).json(
        buildErrorResponse('Validation failed', validationResult.error.message)
      );
      return;
    }
    const companyId = req.headers['x-user-id'] as string;
    const step3Data = validationResult.data;
    
    if (!companyId) {
      res.status(AuthStatusCode.COMPANY_NOT_AUTHENTICATED).json(
        buildErrorResponse('Company not authenticated', 'Authentication required')
      );
      return;
    }
    
    const company = await this.companyService.completeStep3(companyId, step3Data);

    res.status(CompanyStatusCode.STEP3_COMPLETED).json(
      buildSuccessResponse({ 
        company, 
        message: "Profile completed! Submitted for admin review." 
      }, 'Step 3 completed successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(ValidationStatusCode.VALIDATION_ERROR).json(
      buildErrorResponse(errorMessage, 'Step 3 completion failed')
    );
  }
}

  async getCompanyProfile(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.headers['x-user-id'] as string;
      if (!companyId) {
        res.status(AuthStatusCode.COMPANY_NOT_AUTHENTICATED).json(buildErrorResponse('Company not authenticated','Authentication required'));
        return;
      }
      const company = await this.companyService.getCompanyProfile(companyId);
      const profileStep = await this.companyService.getProfileStep(companyId);
      res.status(CompanyStatusCode.PROFILE_RETRIEVED).json(buildSuccessResponse({company, profileStep},'Company profile retrieved successfully'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(buildErrorResponse(errorMessage,'Failed to retreive company profile'));
    }
  }

async getProfileStep(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.headers['x-user-id'] as string;
    
    if (!companyId) {
      res.status(AuthStatusCode.COMPANY_NOT_AUTHENTICATED).json(
        buildErrorResponse('Company not authenticated', 'Authentication required')
      );
      return;
    }
    const company = await this.companyService.getCompanyProfile(companyId);
    
    if (company?.isVerified) {
      res.status(HttpStatusCode.OK).json(
        buildSuccessResponse({ profileStep: "approved" }, 'Company is approved')
      );
      return;
    }
    if (company?.rejectionReason) {
      res.status(HttpStatusCode.OK).json(
        buildSuccessResponse({ profileStep: "rejected" }, 'Company is rejected')
      );
      return;
    }
    
    const profileStep = await this.companyService.getProfileStep(companyId);
    res.status(HttpStatusCode.OK).json(
      buildSuccessResponse({ profileStep }, 'Profile step retrieved successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      buildErrorResponse(errorMessage, 'Failed to retrieve profile step')
    );
  }
}

async getPendingCompanies(req: Request, res: Response): Promise<void> {
  try {
    const companies = await this.companyService.getPendingCompanies();
    res.status(CompanyStatusCode.PENDING_COMPANIES_RETRIEVED).json(
      buildSuccessResponse({ companies }, 'Pending companies retrieved successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      buildErrorResponse(errorMessage, 'Failed to retrieve pending companies')
    );
  }
}

async approveCompany(req: Request, res: Response): Promise<void> {
  try {
    const { id: companyId } = req.params;
    const adminId = req.headers['x-user-id'] as string;
    const adminRole = req.headers['x-user-role'] as string;
    if (!adminId || adminRole !== 'admin') {
      res.status(AuthStatusCode.ADMIN_NOT_AUTHENTICATED).json(
        buildErrorResponse('Admin not authenticated', 'Admin access required')
      );
      return;
    }
    const company = await this.companyService.approveCompany(companyId, adminId);
    res.status(CompanyStatusCode.COMPANY_APPROVED).json(
      buildSuccessResponse({ 
        company, 
        message: "Company approved successfully" 
      }, 'Company approved successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(ValidationStatusCode.VALIDATION_ERROR).json(
      buildErrorResponse(errorMessage, 'Company approval failed')
    );
  }
}
async rejectCompany(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = RejectCompanySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(ValidationStatusCode.REJECTION_REASON_REQUIRED).json(
        buildErrorResponse('Validation failed', validationResult.error.message)
      );
      return;
    }
    const { id: companyId } = req.params;
    const { reason } = validationResult.data;
    const adminId = req.headers['x-user-id'] as string;
    const adminRole = req.headers['x-user-role'] as string;
    
    if (!adminId || adminRole !== 'admin') {
      res.status(AuthStatusCode.ADMIN_NOT_AUTHENTICATED).json(
        buildErrorResponse('Admin not authenticated', 'Admin access required')
      );
      return;
    }
    
    const company = await this.companyService.rejectCompany(companyId, reason, adminId);
    res.status(CompanyStatusCode.COMPANY_REJECTED).json(
      buildSuccessResponse({ company }, 'Company rejected successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(ValidationStatusCode.VALIDATION_ERROR).json(
      buildErrorResponse(errorMessage, 'Company rejection failed')
    );
  }
}

async getAllCompaniesForAdmin(req: Request, res: Response): Promise<void> {
  try {
    const companies = await this.companyService.getAllCompaniesForAdmin();
    res.status(CompanyStatusCode.COMPANIES_RETRIEVED).json(
      buildSuccessResponse({ companies }, 'Companies retrieved successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      buildErrorResponse(errorMessage, 'Failed to retrieve companies')
    );
  }
}

async getCompanyDetailsForAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { id: companyId } = req.params;
    const adminId = req.headers['x-user-id'] as string;
    const adminRole = req.headers['x-user-role'] as string;
    if (!adminId || adminRole !== 'admin') {
      res.status(AuthStatusCode.ADMIN_NOT_AUTHENTICATED).json(
        buildErrorResponse('Admin not authenticated', 'Admin access required')
      );
      return;
    }
    const company = await this.companyService.getCompanyDetailsForAdmin(companyId);
    res.status(HttpStatusCode.OK).json(
      buildSuccessResponse({ company }, 'Company details retrieved successfully')
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      buildErrorResponse(errorMessage, 'Failed to retrieve company details')
    );
  }
}

async getCompanyJobCount(req: Request, res: Response): Promise<void> {
  try {
    const companyId: string = req.headers['x-user-id'] as string;
    
    if (!companyId) {
      res.status(AuthStatusCode.COMPANY_NOT_AUTHENTICATED).json(
        buildErrorResponse('Company not authenticated', 'Authentication required')
      );
      return;
    }
    
    const jobCount: number = await this.companyService.getCompanyJobCount(companyId);
    
    res.status(HttpStatusCode.OK).json(
      buildSuccessResponse({ count: jobCount }, 'Job count retrieved successfully')
    );
  } catch (err) {
    const errorMessage: string = err instanceof Error ? err.message : 'Unknown error';
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(
      buildErrorResponse(errorMessage, 'Failed to retrieve job count')
    );
  }
}
}
