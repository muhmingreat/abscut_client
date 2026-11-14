
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/api";
import "./AcademyHome.css";

const CATEGORIES = [
  "All",
  "Trouser",
  "Shirt",
  "Agbada",
  "Senator",
  "Caftan",
  "Native Wear",
  "Pattern Making",
  "Embroidery",
];

const LEVELS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
  { label: "All Levels", value: "all-levels" },
];

function formatPrice(price, currency = "NGN") {
  const amount = Number(price);

  if (!Number.isFinite(amount)) return "Price unavailable";

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₦${amount.toLocaleString("en-NG")}`;
  }
}

function formatDuration(hours) {
  const duration = Number(hours);

  if (!Number.isFinite(duration) || duration <= 0) {
    return "Self-paced learning";
  }

  return `${duration} ${duration === 1 ? "hour" : "hours"}`;
}

function AcademyHome() {
  const [courses, setCourses] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 12,
  });

  const [searchInput, setSearchInput] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    level: "",
    page: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", String(filters.page));
      params.set("limit", "12");

      if (filters.search.trim()) {
        params.set("search", filters.search.trim());
      }

      if (filters.category) {
        params.set("category", filters.category);
      }

      if (filters.level) {
        params.set("level", filters.level);
      }

      const response = await apiRequest(
        `/academy/courses?${params.toString()}`
      );

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to load Academy courses."
        );
      }

      setCourses(
        Array.isArray(response.courses) ? response.courses : []
      );

      setPagination(
        response.pagination || {
          page: 1,
          pages: 1,
          total: response.courses?.length || 0,
          limit: 12,
        }
      );
    } catch (err) {
      setError(
        err.message || "Something went wrong while loading courses."
      );
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  function handleSearch(event) {
    event.preventDefault();

    setFilters((current) => ({
      ...current,
      search: searchInput.trim(),
      page: 1,
    }));
  }

  function handleCategory(category) {
    setFilters((current) => ({
      ...current,
      category: category === "All" ? "" : category,
      page: 1,
    }));
  }

  function handleLevel(event) {
    setFilters((current) => ({
      ...current,
      level: event.target.value,
      page: 1,
    }));
  }

  function changePage(page) {
    if (page < 1 || page > pagination.pages) return;

    setFilters((current) => ({
      ...current,
      page,
    }));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function clearFilters() {
    setSearchInput("");

    setFilters({
      search: "",
      category: "",
      level: "",
      page: 1,
    });
  }

  const selectedCategory = filters.category || "All";

  return (
    <main className="academy-home">

      {/* HERO */}
      <section className="academy-hero">
        <div className="academy-hero-pattern" />

        <div className="academy-container academy-hero-content">
          <div className="academy-hero-copy">
            <span className="academy-eyebrow">
              <span className="academy-eyebrow-line" />
              ABS CUT FASHION ACADEMY
            </span>

            <h1>
              Learn the Art.
              <br />
              <span>Master the Craft.</span>
            </h1>

            <p>
              Build real fashion and tailoring skills through practical lessons,
              expert guidance and structured courses designed to take you from
              beginner to confident fashion creator.
            </p>

            <div className="academy-hero-actions">
              <a href="#academy-courses" className="academy-primary-button">
                Explore Courses <span>→</span>
              </a>

              <Link
                to="/academy/my-courses"
                className="academy-secondary-button"
              >
                My Learning
              </Link>
            </div>

            <div className="academy-hero-highlights">
              <span>
                <i>✓</i> Practical lessons
              </span>
              <span>
                <i>✓</i> Learn at your pace
              </span>
              <span>
                <i>✓</i> Certificates
              </span>
            </div>
          </div>

          <div className="academy-hero-art">
            <div className="academy-hero-image-frame">
              <img
                src="/images/academy-hero.jpg"
                alt="Fashion tailoring and garment creation"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />

              <div className="academy-hero-image-fallback">
                <span className="academy-fallback-scissors">✂</span>
                <span>CREATE WITH SKILL</span>
                <strong>Fashion is a craft.</strong>
              </div>
            </div>

            <div className="academy-hero-stamp">
              <span>LEARN</span>
              <strong>CREATE</strong>
              <span>MASTER</span>
            </div>

            <div className="academy-hero-gold-line" />
          </div>
        </div>

        <div className="academy-hero-bottom">
          <span>DESIGNED FOR ASPIRING FASHION CREATORS</span>
          <span>ABS CUT · FASHION ACADEMY</span>
        </div>
      </section>

      {/* LEARNING FEATURES */}
      <section className="academy-benefits">
        <div className="academy-container academy-benefits-grid">
          <article className="academy-benefit">
            <span className="academy-benefit-icon">01</span>
            <div>
              <h3>Practical Learning</h3>
              <p>Learn garment construction step by step.</p>
            </div>
          </article>

          <article className="academy-benefit">
            <span className="academy-benefit-icon">02</span>
            <div>
              <h3>Learn Your Way</h3>
              <p>Access recorded lessons and live sessions.</p>
            </div>
          </article>

          <article className="academy-benefit">
            <span className="academy-benefit-icon">03</span>
            <div>
              <h3>Track Progress</h3>
              <p>Follow your learning journey and achievements.</p>
            </div>
          </article>

          <article className="academy-benefit">
            <span className="academy-benefit-icon">04</span>
            <div>
              <h3>Earn Certificates</h3>
              <p>Receive certificates on eligible courses.</p>
            </div>
          </article>
        </div>
      </section>

      {/* COURSE CATALOGUE */}
      <section className="academy-catalogue" id="academy-courses">
        <div className="academy-container">

          <div className="academy-section-heading">
            <div>
              <span className="academy-section-eyebrow">
                BUILD YOUR SKILLS
              </span>

              <h2>
                Explore Our <span>Courses</span>
              </h2>

              <p>
                Find a class that matches your interests and start developing
                your fashion skills.
              </p>
            </div>

            <Link
              to="/academy/my-courses"
              className="academy-my-learning-link"
            >
              My Courses <span>→</span>
            </Link>
          </div>

          {/* SEARCH */}
          <form className="academy-search-form" onSubmit={handleSearch}>
            <div className="academy-search-input-wrap">
              <span className="academy-search-icon">⌕</span>

              <input
                type="search"
                placeholder="Search courses, e.g. Trouser, Agbada, Shirt..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />

              {searchInput && (
                <button
                  type="button"
                  className="academy-clear-search"
                  onClick={() => {
                    setSearchInput("");

                    setFilters((current) => ({
                      ...current,
                      search: "",
                      page: 1,
                    }));
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <button type="submit" className="academy-search-button">
              Search Courses
            </button>
          </form>

          {/* FILTERS */}
          <div className="academy-filter-area">
            <div className="academy-category-filters">
              {CATEGORIES.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={
                    selectedCategory === category
                      ? "academy-category-chip active"
                      : "academy-category-chip"
                  }
                  onClick={() => handleCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <select
              className="academy-level-filter"
              value={filters.level}
              onChange={handleLevel}
              aria-label="Filter by course level"
            >
              <option value="">All Levels</option>

              {LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* RESULTS HEADING */}
          <div className="academy-results-heading">
            <div>
              <h3>
                {filters.search
                  ? `Results for "${filters.search}"`
                  : filters.category || "Available Courses"}
              </h3>

              <p>
                {loading
                  ? "Finding courses..."
                  : `${pagination.total || courses.length} course${
                      (pagination.total || courses.length) === 1 ? "" : "s"
                    } available`}
              </p>
            </div>

            {(filters.search || filters.category || filters.level) && (
              <button
                type="button"
                className="academy-reset-filters"
                onClick={clearFilters}
              >
                Clear filters ×
              </button>
            )}
          </div>

          {/* ERROR */}
          {error && (
            <div className="academy-error">
              <div>
                <strong>We couldn't load the courses.</strong>
                <p>{error}</p>
              </div>

              <button type="button" onClick={loadCourses}>
                Try Again
              </button>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="academy-course-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="academy-course-skeleton" key={index}>
                  <div className="academy-skeleton-image" />
                  <div className="academy-skeleton-body">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COURSE CARDS */}
          {!loading && !error && courses.length > 0 && (
            <div className="academy-course-grid">
              {courses.map((course) => (
                <article
                  className="academy-course-card"
                  key={course._id || course.slug}
                >
                  <Link
                    to={`/academy/courses/${course.slug}`}
                    className="academy-course-image"
                  >
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="academy-course-placeholder">
                        <span>ABS CUT</span>
                        <strong>FASHION ACADEMY</strong>
                        <i>✂</i>
                      </div>
                    )}

                    <span className="academy-course-level">
                      {course.level || "All Levels"}
                    </span>

                    {course.isFree && (
                      <span className="academy-free-label">FREE</span>
                    )}
                  </Link>

                  <div className="academy-course-card-content">
                    <div className="academy-course-meta">
                      <span>{course.category || "Fashion"}</span>

                      {course.certificateEnabled && (
                        <span className="academy-certificate-label">
                          Certificate
                        </span>
                      )}
                    </div>

                    <h3>
                      <Link to={`/academy/courses/${course.slug}`}>
                        {course.title}
                      </Link>
                    </h3>

                    <p className="academy-course-description">
                      {course.shortDescription ||
                        "Build practical fashion and tailoring skills with ABS CUT."}
                    </p>

                    <div className="academy-course-instructor">
                      <span className="academy-instructor-avatar">
                        {(course.instructorName || "A")
                          .charAt(0)
                          .toUpperCase()}
                      </span>

                      <span>
                        {course.instructorName || "ABS CUT Academy"}
                      </span>
                    </div>

                    <div className="academy-course-card-bottom">
                      <span className="academy-course-duration">
                        <span>◷</span>
                        {formatDuration(course.estimatedDurationHours)}
                      </span>

                      <strong className="academy-course-price">
                        {course.isFree
                          ? "Free"
                          : formatPrice(course.price, course.currency)}
                      </strong>
                    </div>

                    {/* COURSE DETAILS / ENROLLMENT ENTRY POINT */}
                    <Link
                      to={`/academy/courses/${course.slug}`}
                      className="academy-course-button"
                    >
                      View Course &amp; Enroll <span>→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* EMPTY STATE */}
          {!loading && !error && courses.length === 0 && (
            <div className="academy-empty-state">
              <span className="academy-empty-icon">⌕</span>
              <h3>No courses found</h3>

              <p>
                We couldn't find a course matching your current search or
                filters.
              </p>

              <button type="button" onClick={clearFilters}>
                View All Courses
              </button>
            </div>
          )}

          {/* PAGINATION */}
          {!loading && !error && pagination.pages > 1 && (
            <div className="academy-pagination">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => changePage(pagination.page - 1)}
              >
                ← Previous
              </button>

              <span>
                Page <strong>{pagination.page}</strong> of{" "}
                <strong>{pagination.pages}</strong>
              </span>

              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => changePage(pagination.page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="academy-cta">
        <div className="academy-container academy-cta-content">
          <div>
            <span>YOUR CRAFTSMANSHIP JOURNEY STARTS HERE</span>
            <h2>Turn Your Passion Into a Skill.</h2>

            <p>
              Explore our courses and take the next step in your fashion
              journey.
            </p>
          </div>

          <a href="#academy-courses" className="academy-cta-button">
            Find Your Course <span>→</span>
          </a>
        </div>
      </section>
    </main>
  );
}

export default AcademyHome;
