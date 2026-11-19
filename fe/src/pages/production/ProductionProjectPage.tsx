import React from "react";
import Navbar from "../../components/Navbar";
import ProductionPackageBuilder from "../../components/equipment/ProductionPackageBuilder";

export const ProductionProjectPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <Navbar />
      <div className="pt-20 pb-16">
        <ProductionPackageBuilder />
      </div>
    </div>
  );
};

export default ProductionProjectPage;
