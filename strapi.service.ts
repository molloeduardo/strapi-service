import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

export enum StrapiOperator {
  CONTAINS = 'contains',
  CONTAINS_INSENSITIVE = 'containsi',
  NOT_CONTAINS = 'notContains',
  NOT_CONTAINS_INSENSITIVE = 'notContainsi',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUALS = 'lte',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUALS = 'gte',
  IS_NULL = 'null',
  IS_NOT_NULL = 'notNull',
  IN = 'in',
  NOT_IN = 'notIn',
  BETWEEN = 'between',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith'
}

export enum StrapiLogicOperator {
  OR = 'or',
  AND = 'and'
}

class Where {
  entities: string[] = [];
  operator: StrapiOperator;
  logicOperator?: StrapiLogicOperator;
  value: any;
}

class StrapiObject {
  customQueryParams: string = '';
  relations: string[] = [];
  fields: string[] = [];
  from: string;
  type: Type;
  where: Where[] = [];
  sort: string[] = [];
  pagination: Pagination = new Pagination();
  body?: any;
}

class Pagination {
  page?: number = 1;
  pageSize: number = 25;
}

class StrapiResult {
  data: any;
  meta: any;
}

class StrapiUserToken {
  token: string;
  user: any;
}

enum Type {
  GET,
  POST,
  PUT,
  DELETE
}

@Injectable(
  { providedIn: 'root' }
)
export class StrapiService {

  defaultStrapiEndpoint: string = 'http://localhost:1337/api/';
  strapiEndpoint: string;
  strapiObject: StrapiObject;

  constructor(
    private http: HttpClient
  ) {
    this.strapiObject = new StrapiObject();

    // Strapi endpoint
    const environmentVar: any = environment;
    if (environmentVar.strapiEndpoint) {
      this.strapiEndpoint = environmentVar.strapiEndpoint;
    } else {
      this.strapiEndpoint = this.defaultStrapiEndpoint;
    }
  }

  download(uploadUrl: string): void {
    window.open(this.strapiEndpoint.replace('/api/', '') + uploadUrl);
  }

  createUser(body: any):  Observable<any> {
    return this.http.post<StrapiResult>(this.strapiEndpoint  + 'auth/local/register', body);
  }

  private getRequest(endpoint: string): any {
    this.strapiObject.type = Type.GET;
    return this.http.get<StrapiResult>(this.strapiEndpoint + endpoint);
  }

  private postRequest(endpoint: string, body: any): any {
    this.strapiObject.body = body;
    this.strapiObject.type = Type.POST;
    return this.http.post<StrapiResult>(this.strapiEndpoint + endpoint, body);
  }

  get(endpoint: string): Observable<StrapiResult> {
    return this.getRequest(endpoint);
  }

  getAny(endpoint: string): Observable<any> {
    return this.getRequest(endpoint);
  }

  post(endpoint: string, body: any): Observable<StrapiResult> {
    return this.postRequest(endpoint, body);
  }

  postAny(endpoint: string, body: any): Observable<any> {
    return this.postRequest(endpoint, body);
  }

  put(endpoint: string, body: any): Observable<StrapiResult> {
    this.strapiObject.body = body;
    this.strapiObject.type = Type.PUT;
    return this.http.put<StrapiResult>(this.strapiEndpoint + endpoint, body);
  }

  delete(endpoint: string) {
    this.strapiObject.type = Type.DELETE;
    return this.http.delete<StrapiResult>(this.strapiEndpoint + endpoint);
  }

  addCustomQueryParams(queryParams: string) {
    this.strapiObject.customQueryParams = queryParams;
    return this;
  }

  where(whereObject: Where[]) {
    this.strapiObject.where = whereObject;
    return this;
  }

  whereAppend(whereObject: Where[]) {
    this.strapiObject.where.push(...whereObject);
    return this;
  }

  pagination(paginationObject: Pagination) {
    this.strapiObject.pagination = paginationObject;
    return this;
  }

  private reset() {
    this.strapiObject.from = '';
    this.strapiObject.fields = [];
    this.strapiObject.where = [];
    this.strapiObject.relations = [];
    this.strapiObject.sort = [];
    this.strapiObject.pagination = new Pagination();
    this.strapiObject.body = {};
  }

  select(relations: string[]) {
    for (let item of relations) {
      this.strapiObject.relations.push(item);
    }
    return this;
  }

  from(table: string) {
    this.strapiObject.from = table;
    return this;
  }

  sort(sort: string[]) {
    this.strapiObject.sort = sort;
    return this;
  }

  login(email: string, password: string): Observable<StrapiUserToken> {
    return this.http.post<StrapiUserToken>(this.strapiEndpoint + 'auth/local', { identifier: email, password });
  }

  private buildQuery(): string {

    let result = '';

    // Relations
    if (this.strapiObject.relations.length === 1 && this.strapiObject.relations[0] === '*') {
      result += 'populate=*';
    } else {
      let index = 0;
      for (let item of this.strapiObject.relations) {
        result += `populate[${index}]=${item}`;
        if (index + 1 < this.strapiObject.relations.length) {
          result += '&';
        }
        index ++;
      }
    }

    // Where build
    let index = 0;
    for (let item of this.strapiObject.where) {
      result += '&filters';
      if (item.logicOperator) {
        result += `[$${item.logicOperator}][${index}]`;
      }
      for (let entity of item.entities) {
        result += `[${entity}]`;
      }
      result += `[$${item.operator}]=${item.value}`;
      index ++;
    }

    // Sort
    index = 0;
    for (let item of this.strapiObject.sort) {
      result += `&sort[${index}]=${item}`;
      index ++;
    }

    // Pagination
    if (!this.strapiObject.pagination.page) this.strapiObject.pagination.page = 1;
    result += `&pagination[page]=${this.strapiObject.pagination.page}&pagination[pageSize]=${this.strapiObject.pagination.pageSize}`;

    return result;

  }

  private findRequest(endpoint?: string): any {
    let apiString = '?';
    apiString += this.buildQuery();

    // API call
    let apiEndpointUrl = this.strapiEndpoint + this.strapiObject.from + apiString;
    if (endpoint) {
      apiEndpointUrl = this.strapiEndpoint + endpoint;
    }
    if (this.strapiObject.customQueryParams) {
      apiEndpointUrl += this.strapiObject.customQueryParams;
    }
    this.reset();
    return this.http.get<StrapiResult>(apiEndpointUrl);
  }

  find(endpoint?: string): Observable<StrapiResult> {
    return this.findRequest(endpoint);
  }

  findAny(endpoint?: string): Observable<any> {
    return this.findRequest(endpoint);
  }

  findOne(id: number): Observable<StrapiResult> {

    let apiString = '?';
    apiString += this.buildQuery();

    // API call
    const apiEndpointUrl = this.strapiEndpoint + this.strapiObject.from + '/' + id + apiString;
    this.reset();
    return this.http.get<StrapiResult>(apiEndpointUrl);

  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(this.strapiEndpoint + 'auth/forgot-password', {
      email
    });
  }

  resetPassword(password: string, passwordConfirmation: string, code: string): Observable<any> {
    return this.http.post<any>(this.strapiEndpoint + 'auth/reset-password', {
      password,
      passwordConfirmation,
      code
    });
  }

}
