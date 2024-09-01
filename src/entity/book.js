
export default class Book {
    static parseBook(data, template) {
        const book = {};
        for (let i = 0; i < template.length; i++)
            book[template[i].toLowerCase()] = data[i] != undefined ? data[i] : null;
        return book
    }
}