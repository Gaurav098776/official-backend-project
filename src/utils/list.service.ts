export class ListService {
  splitListIntoParts(list: any[], n: number) {
    const finalizedList = [];
    const chunkSize = 10;
    for (let i = 0; i < list.length; i += chunkSize) {
      const chunk = list.slice(i, i + chunkSize);
      finalizedList.push(chunk);
    }

    return finalizedList;
  }
}
