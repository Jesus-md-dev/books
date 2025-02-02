const Stars = (props) => {
    let stars = []
    let string_stars = props.n.toString()
    let n_stars = string_stars.replace(',', '.')
    if (n_stars > 0) {
        for (let index = 1; index <= n_stars; index++) {
            stars.push(<img key={index} alt="Star" width="" height="" src="/star.svg"></img>)
        }
        if (n_stars % 1 !== 0) {
            stars.push(<img key={n_stars} alt="Half star" width="" height="" src="/star-half.svg"></img>)
        }
    }
    else if (n_stars < 0) {
        n_stars *= -1
        for (let index = 1; index <= n_stars; index++) {
            stars.push(<img key={index} alt="Poop" width="" height="" src="/poop.svg"></img>)
        }
        if (n_stars % 1 !== 0) {
            stars.push(<img key={n_stars} alt="Half poop" width="" height="" src="/poop-half.svg"></img>)
        }
    }
    else {
        stars.push(<img key={n_stars} alt="Half poop" width="" height="" src="/zero.svg"></img>)
    }

    return(
        <div className='flex justify-center h-5'>
            {stars}
        </div>
    );
}

export default Stars;