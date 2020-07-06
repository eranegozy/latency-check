//argMax method
const argMax = (array) => {
    return [].reduce.call(array, (m, c, i, arr) => c > arr[m] ? i : m, 0)
}

//convolution method
const conv = (vec1, vec2) => {
    if (vec1.length === 0 || vec2.length === 0) {
        throw new Error("Vectors can not be empty!");
    }
    const volume = vec1;
    const kernel = vec2;
    let displacement = 0;
    const convVec = [];

    for (let i = 0; i < volume.length; i++) {
        for (let j = 0; j < kernel.length; j++) {
        if (displacement + j !== convVec.length) {
            convVec[displacement + j] =
            convVec[displacement + j] + volume[i] * kernel[j];
        } else {
            convVec.push(volume[i] * kernel[j]);
        }
        }
        displacement++;
    }

    return convVec;
};