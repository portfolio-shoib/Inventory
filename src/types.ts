export interface InventoryItem {
  ID: string | number;
  "Item Name": string;
  SKU: string;
  Category: string;
  Quantity: number;
  "Unit Price": number;
  "Total Value": number;
  "Last Updated": string;
  Description?: string;
  Unit?: string;
  "Weight Value"?: number;
  "Weight Unit"?: string;
  "Vendor Name"?: string;
  "Vendor Contact"?: string;
}

export interface LogItem {
  Timestamp: string;
  "Item ID": string | number;
  "Item Name": string;
  Action: string;
  "Quantity Changed": number;
  "Updated By": string;
}

export type ConnectionMode = "demo" | "live";

export interface ConnectionConfig {
  webAppUrl: string;
  lastTested: string | null;
  testStatus: "untested" | "success" | "error";
  errorMessage?: string;
}

export const CATEGORIES = [
  "Electronics",
  "Apparel",
  "Home & Kitchen",
  "Office Supplies",
  "Books & Stationery",
  "Sports & Outdoors",
  "Automotive",
  "Toys & Games",
  "Other"
];
