/**
 * Renders a row of star, half-star, poop, or zero icons based on the rating value.
 * @param {{ n: number|string }} props - The rating value (can be positive, negative, or zero).
 * @returns {JSX.Element}
 */
const Stars = ({ n }) => {
    const stars = [];
    const nString = n.toString();
    let nStars = parseFloat(nString.replace(',', '.'));

    if (nStars > 0) {
        for (let i = 1; i <= Math.floor(nStars); i++) {
            stars.push(<img key={i} alt="" src="/star.svg" />);
        }
        if (nStars % 1 !== 0) {
            stars.push(<img key={nStars} alt="" src="/star-half.svg" />);
        }
    } else if (nStars < 0) {
        nStars = Math.abs(nStars);
        for (let i = 1; i <= Math.floor(nStars); i++) {
            stars.push(<img key={i} alt="" src="/poop.svg" />);
        }
        if (nStars % 1 !== 0) {
            stars.push(<img key={nStars} alt="" src="/poop-half.svg" />);
        }
    } else {
        stars.push(<img key={nStars} alt="" src="/zero.svg" />);
    }

    return (
        <span className="inline-flex h-5 justify-center" aria-hidden="true">
            {stars}
        </span>
    );
};

export default Stars;