// src/app/layout.js
import "./globals.css";
import Navigation from "../components/Navigation";
export const metadata = {
  title: "Amazon Product Scraper",
  description: "Batch scrape Amazon product data",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
