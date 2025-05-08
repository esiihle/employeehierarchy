// CircularImage.js
import React from "react";

const CircularImage = ({ imageUrl, altText }) => {
    return (
        <div style={styles.circularImage}>
            <img src={imageUrl} alt={altText} style={styles.image} />
        </div>
    );
};

const styles = {
    circularImage: {
        width: 100,
        height: 100,
        borderRadius: "50%",
        overflow: "hidden",
        margin: "0 auto 10px", // Adjust margin as needed
    },
    image: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
};

export default CircularImage;
