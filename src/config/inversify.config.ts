import "reflect-metadata";
import { Container } from "inversify";
import TYPES from "./types";
import { CompanyRepository } from "../repositories/CompanyRepository";
import { CompanyService } from "../services/CompanyService";
import { EmailService } from "../services/EmailService";
import { CompanyController } from "../controllers/CompanyController"; 
import { ICompanyRepository } from "../repositories/ICompanyRepository";
import { ICompanyService } from "../services/ICompanyService";

const container = new Container();

container.bind<CompanyRepository>(TYPES.CompanyRepository).to(CompanyRepository);
container.bind<CompanyService>(TYPES.CompanyService).to(CompanyService);
container.bind<EmailService>(TYPES.EmailService).to(EmailService);
container.bind<CompanyController>(TYPES.CompanyController).to(CompanyController); 
container.bind<ICompanyRepository>(TYPES.ICompanyRepository).to(CompanyRepository);
container.bind<ICompanyService>(TYPES.ICompanyService).to(CompanyService);

export default container;