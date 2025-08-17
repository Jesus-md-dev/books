
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
            stars.push(<img key={i} alt="Star" src="/star.svg" />);
        }
        if (nStars % 1 !== 0) {
            stars.push(<img key={nStars} alt="Half star" src="/star-half.svg" />);
        }
    } else if (nStars < 0) {
        nStars = Math.abs(nStars);
        for (let i = 1; i <= Math.floor(nStars); i++) {
            stars.push(<img key={i} alt="Poop" src="/poop.svg" />);
        }
        if (nStars % 1 !== 0) {
            stars.push(<img key={nStars} alt="Half poop" src="/poop-half.svg" />);
        }
    } else {
        stars.push(<img key={nStars} alt="Zero" src="/zero.svg" />);
    }

    return (
        <div className="flex justify-center h-5">
            {stars}
        </div>
    );
};

export default Stars;