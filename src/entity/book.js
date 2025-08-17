
/**
 * Book entity class with static parsing utility.
 */
class Book {
    /**
     * Parses a book from data and template arrays.
     * @param {Array} data - The book data array.
     * @param {Array} template - The template array for keys.
     * @returns {Object} Parsed book object.
     */
    static parseBook(data, template) {
        const book = {};
        for (let i = 0; i < template.length; i++) {
            book[template[i].toLowerCase()] = data[i] !== undefined ? data[i] : null;
        }
        return book;
    }
}

export default Book;
