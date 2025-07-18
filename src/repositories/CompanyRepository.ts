import { injectable } from "inversify";
import {prisma} from '../prisma/client';
import { Company,Otp } from "@prisma/client"; 
import { ICompanyRepository } from "./ICompanyRepository";

@injectable()
export class CompanyRepository implements ICompanyRepository{
    async findByEmail(email:string) :Promise<Company | null>{
        return prisma.company.findUnique({where:{email}});
    }

    async createCompany(data:{email:string;password:string;companyName:string;}):Promise<Company>{
        console.log("Repository createCompany data:", data);
        return prisma.company.create({data})
    }

    async findById(id:string):Promise<Company|null>{
        return prisma.company.findUnique({where:{id }})
    }

    async saveOTP(email:string,otp:number):Promise<Otp>{
        return prisma.otp.create({
            data:{email,otp}
        })
    }

    async findOTP(email:string):Promise<Otp|null>{
        return prisma.otp.findFirst({
            where:{email},
            orderBy:{createdAt:'desc'}
        })
    }

    async deleteOtp(email:string):Promise<void>{
        await prisma.otp.deleteMany({
            where:{email}
        })
    }
}