const BrandLoader = ({ message = "Weaving the Mrigmaya edit...", compact = false }) => {
  const primary = Array.from("MRIGMAYA");

  return (
    <div
      className={`brand-loader ${compact ? "brand-loader--compact" : ""}`}
      aria-label="Loading Mrigmaya"
      role="status"
    >
      <span className="brand-loader__orb" aria-hidden="true" />
      <div className="brand-loader__word">
        <div className="brand-loader__row">
          {primary.map((char, index) => (
            <span
              key={`primary-${char}-${index}`}
              className="brand-loader__letter"
              style={{ "--delay": `${index * 110}ms` }}
            >
              {char}
            </span>
          ))}
        </div>
      </div>
      {message && <p className="brand-loader__tagline">{message}</p>}
    </div>
  );
};

export default BrandLoader;
