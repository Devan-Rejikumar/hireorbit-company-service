import { injectable,inject } from "inversify";
import TYPES from '../config/types';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Company } from "@prisma/client";
import { ICompanyRepository } from "../repositories/ICompanyRepository";
import { EmailService } from "./EmailService";
import { ICompanyService } from "./ICompanyService";


const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

@injectable()
export class CompanyService implements ICompanyService{
    constructor(
        @inject(TYPES.ICompanyRepository) private companyRepository:ICompanyRepository,
        @inject(TYPES.EmailService) private emailService:EmailService
        
) {}
 async register(email:string,password:string,companyName:string,role:string='company'):Promise<Company>{
    console.log("Service register paramsssssss:", email, password, companyName, );
    const existingCompany = await this.companyRepository.findByEmail(email);
    if(existingCompany) throw new Error("Email already in use");
    const hashed = await bcrypt.hash(password,10)
    return this.companyRepository.createCompany({email,password:hashed,companyName});
 }

 async login(email:string,password:string):Promise<{company:Company;token:string}>{
    const company = await this.companyRepository.findByEmail(email);
    if(!company) throw new Error("Invalid credentials");
    const valid = await bcrypt.compare(password,company.password)
    if(!valid) throw new Error("Invalid Credentials");
    const token = jwt.sign({companyId:company.id,email:company.email},JWT_SECRET,{expiresIn:"1d"})
    return {company,token}
 }

   async generateOTP(email: string): Promise<{ message: string }> {
    const existingCompany = await this.companyRepository.findByEmail(email);
    if (existingCompany) throw new Error("Email already registered");
    const otp = Math.floor(100000 + Math.random() * 900000);
    console.log(`Generated OTP for ${email}: ${otp}`);
    await this.companyRepository.saveOTP(email, otp);
    await this.emailService.sendOTP(email, otp);
    return { message: "OTP sent successfully" };
  }

  async verifyOTP(email: string, otp: number): Promise<{ message: string }> {
    const otpRecord = await this.companyRepository.findOTP(email);
    if (!otpRecord) {
      throw new Error("No OTP found for this email");
    }
    const now = new Date();
    const otpTime = new Date(otpRecord.createdAt);
    const timeDiff = now.getTime() - otpTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    if (minutesDiff > 5) {
      await this.companyRepository.deleteOtp(email);
      throw new Error("OTP has expired");
    }
    if (otpRecord.otp !== otp) {
      throw new Error("Invalid OTP");
    }
    await this.companyRepository.deleteOtp(email);
    return { message: "OTP verified successfully" };
  }

  async resendOTP(email: string): Promise<{ message: string }> {
    const existingCompany = await this.companyRepository.findByEmail(email);
    if (existingCompany) throw new Error("Email already registered");
    await this.companyRepository.deleteOtp(email);
    return this.generateOTP(email);
  }

  async getAllCompanies(): Promise<Company[]>{
    const companies = await this.companyRepository.getAllCompanies();
    return companies;
  }
}