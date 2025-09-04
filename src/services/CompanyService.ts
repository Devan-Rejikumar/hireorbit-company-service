import { injectable, inject } from "inversify";
import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";
import TYPES from "../config/types";
import { ICompanyRepository } from "../repositories/ICompanyRepository";
import { ICompanyService } from "./ICompanyService";
import { Company } from "@prisma/client";
import { IEmailService } from "./IEmailService";
import { CompanyProfileData, CompanyRegistrationStep2, CompanyRegistrationStep3, CompanyProfileStep, CompanyProfileStepData } from "../types/company";
import { EmailService } from "./EmailService";
import { RedisService } from "./RedisService";
import { PaginationResult } from "../interfaces/IBaseRepository";

interface CompanyTokenPayload extends JwtPayload {
  userId: string;
  companyId: string;
  email: string;
  role: string;
  userType: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh_secret";

@injectable()
export class CompanyService implements ICompanyService {
  constructor(
    @inject(TYPES.ICompanyRepository)
    private companyRepository: ICompanyRepository,
    @inject(TYPES.EmailService) private emailService: IEmailService,
    @inject(TYPES.RedisService) private redisService: RedisService
  ) { }
  async register(
    email: string,
    password: string,
    companyName: string,
    role: string = "company"
  ): Promise<Company> {
    console.log("Service register paramsssssss:", email, password, companyName);
    const existingCompany = await this.companyRepository.findByEmail(email);
    if (existingCompany) throw new Error("Email already in use");
    const hashed = await bcrypt.hash(password, 10);
    return this.companyRepository.createCompany({
      email,
      password: hashed,
      companyName,
    });
  }

  async login(
    email: string,
    password: string
  ): Promise<{ company: Company; tokens: { accessToken: string; refreshToken: string } }> {
    const company = await this.companyRepository.findByEmail(email);
    if (!company) throw new Error("Invalid credentials");
    const valid = await bcrypt.compare(password, company.password);
    if (!valid) throw new Error("Invalid Credentials");
    const tokenPayload: Omit<CompanyTokenPayload, 'iat' | 'exp'> = {
      userId: company.id,
      companyId: company.id,
      email: company.email,
      role: 'company',
      userType: 'company'
    };
    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "2h" });
    const refreshToken = jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
    return { company, tokens: { accessToken, refreshToken } }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as CompanyTokenPayload;

      const tokenPayload: Omit<CompanyTokenPayload, 'iat' | 'exp'> = {
        userId: decoded.companyId,
        companyId: decoded.companyId,
        email: decoded.email,
        role: 'company',
        userType: 'company'
      };

      const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '2h' });
      return { accessToken: newAccessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }



  async generateOTP(email: string): Promise<{ message: string; }> {
    try {
      const existingCompany = await this.companyRepository.findByEmail(email)
      if (existingCompany) {
        throw new Error('Company already existing')
      }
      const otp = Math.floor(100000 + Math.random() * 900000);
      await this.redisService.storeOTP(email, otp.toString(), 300);
      await this.emailService.sendOTP(email, otp)
      return { message: 'OTP send succesfully' }
    } catch (error) {
      console.error('Company service generatedOTP error', error);
      throw error
    }
  }


  async verifyOTP(email: string, otp: number): Promise<{ message: string; }> {
    const storedOtp = await this.redisService.getOTP(email);
    if (!storedOtp) {
      throw new Error('No OTP found for this email or OTP has expired');
    }
    if (parseInt(storedOtp) !== otp) {
      throw new Error('Invalid credentials')
    }
    await this.redisService.deleteOTP(email);
    return { message: 'OTP deleted succesfully' }
  }

  async resendOTP(email: string): Promise<{ message: string }> {
    const existingCompany = await this.companyRepository.findByEmail(email);
    if (existingCompany) throw new Error("Email already registered");
    await this.redisService.deleteOTP(email);
    return this.generateOTP(email);
  }
  async getAllCompanies(): Promise<Company[]> {
    return this.companyRepository.findAll()
  }

  async getAllCompaniesWithPagination(page: number = 1, limit: number = 10): Promise<PaginationResult<Company>> {
    return this.companyRepository.getAllCompaniesWithPagination(page, limit)
  }
  async blockCompany(id: string): Promise<void> {
    await this.companyRepository.blockCompany(id);
  }
  async unblockCompany(id: string): Promise<void> {
    await this.companyRepository.unblockCompany(id);
  }

  async completeProfile(companyId: string, profileData: CompanyProfileData): Promise<Company> {
    const company = await this.companyRepository.updateCompanyProfile(companyId, { ...profileData, profileCompleted: true })
    return company
  }

  async completeStep2(
    companyId: string,
    step2Data: CompanyRegistrationStep2
  ): Promise<Company> {
    const company = await this.companyRepository.updateCompanyProfile(
      companyId,
      step2Data
    );

    await this.companyRepository.updateProfileStep(companyId, {
      companyDetailsCompleted: true,
      currentStep: 3,
    });

    return company;
  }

  async completeStep3(
    companyId: string,
    step3Data: CompanyRegistrationStep3
  ): Promise<Company> {
    const company = await this.companyRepository.updateCompanyProfile(
      companyId,
      step3Data
    );

    await this.companyRepository.updateCompanyProfile(companyId, {
      ...step3Data,
      profileCompleted: true,
    } as any);

    await this.companyRepository.updateProfileStep(companyId, {
      contactInfoCompleted: true,
      currentStep: 4,
    });

    return company;
  }

  async getCompanyProfile(companyId: string): Promise<Company | null> {
    return this.companyRepository.getCompanyProfile(companyId);
  }

  async updateCompanyProfile(
    companyId: string,
    profileData: Partial<CompanyProfileData>
  ): Promise<Company> {
    return this.companyRepository.updateCompanyProfile(companyId, profileData);
  }

  async getProfileStep(companyId: string): Promise<CompanyProfileStep | null> {
    return this.companyRepository.getProfileStep(companyId);
  }

  async markStepCompleted(
    companyId: string,
    step: number
  ): Promise<CompanyProfileStep> {
    const updateData: Partial<CompanyProfileStepData> = {
      currentStep: step + 1,
    };

    if (step === 1) updateData.basicInfoCompleted = true;
    if (step === 2) updateData.companyDetailsCompleted = true;
    if (step === 3) updateData.contactInfoCompleted = true;

    return this.companyRepository.updateProfileStep(companyId, updateData);
  }

  async getPendingCompanies(): Promise<Company[]> {
    return this.companyRepository.getPendingCompanies();
  }

  async getAllCompaniesForAdmin(): Promise<Company[]> {
    return this.companyRepository.getAllCompaniesForAdmin();
  }

  async approveCompany(companyId: string, adminId: string): Promise<Company> {
    await this.emailService.sendApprovalEmail(
      (await this.companyRepository.getCompanyProfile(companyId))?.email || "",
      (
        await this.companyRepository.getCompanyProfile(companyId)
      )?.companyName || ""
    );

    return this.companyRepository.approveCompany(companyId, adminId);
  }

  async rejectCompany(
    companyId: string,
    reason: string,
    adminId: string
  ): Promise<Company> {
    const company = await this.companyRepository.getCompanyProfile(companyId);
    if (company) {
      await this.emailService.sendRejectionEmail(
        company.email,
        company.companyName,
        reason
      );
    }

    return this.companyRepository.rejectCompany(companyId, reason, adminId);
  }

  async getAllCompaniesForAdminWithPagination(page: number = 1, limit: number = 10): Promise<PaginationResult<Company>> {
    return await this.companyRepository.getAllCompaniesForAdminWithPagination(page, limit);
  }

  async getCompanyDetailsForAdmin(companyId: string): Promise<Company> {
    const company = await this.companyRepository.getCompanyProfile(companyId);
    if (!company) {
      throw new Error('Company not found');
    }
    return company;
  }

  async logoutWithToken(refreshToken: string): Promise<void> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as CompanyTokenPayload;
      console.log(`Company ${decoded.email} logged out successfully`);
    } catch (error) {
      console.log("Invalid company refresh token during logout");
    }
  }

  async getCompanyJobCount(companyId: string): Promise<number> {
    try {
      const response = await fetch(`http://localhost:3002/api/jobs/company/${companyId}/count`);
      if (!response.ok) return 0;
      
      const data = await response.json() as { data: { count: number } };
      return data.data?.count || 0;
    } catch (error) {
      console.error('Error getting job count:', error);
      return 0;
    }
  }
}
