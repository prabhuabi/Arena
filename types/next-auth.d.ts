import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    id?: string;
    idToken?:string
  }

  interface Token {
    accessToken?: string;
    sub?: string;
  }
}
