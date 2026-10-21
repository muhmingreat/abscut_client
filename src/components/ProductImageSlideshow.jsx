import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

function ProductImageSlideshow() {
  const [products, setProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        const response = await apiRequest("/products");

        const list = Array.isArray(response)
          ? response
          : response?.products ??
            response?.data?.products ??
            [];

        const images = list.filter(
          (product) =>
            product.active !== false &&
            typeof product.image === "string" &&
            product.image.trim() !== ""
        );

        if (!cancelled) {
          setProducts(images);
        }
      } catch (error) {
        console.error("Failed to load product images:", error);

        if (!cancelled) {
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (products.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((previousIndex) =>
        (previousIndex + 1) % products.length
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [products.length]);

  if (loading) {
    return (
      <section className="abs-image-showcase">
        <div className="abs-image-loading" />
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  const currentProduct = products[currentIndex];

  return (
    <section className="abs-image-showcase">
      <div className="abs-image-frame" key={currentProduct._id}>
        <img
          className="abs-showcase-image"
          src={currentProduct.image}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      </div>
    </section>
  );
}

export default ProductImageSlideshow;