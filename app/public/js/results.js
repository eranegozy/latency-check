const serverString = window.location.origin;
console.log(serverString);
console.log(location.host);
$.post(serverString+"/results",
            function(data, response){
                console.log("Data posted");
                console.log(typeof data);
                let heads = Object.keys(data[0]);
                console.log(data);
                let table = document.querySelector("table");
                generateTableHead(table, heads);
                generateTable(table, data);
        });

function generateTableHead(table, data) {
    let thead = table.createTHead();
    let row = thead.insertRow();
    for (let key of data) {
        let th = document.createElement("th");
        let text = document.createTextNode(key);
        th.appendChild(text);
        row.appendChild(th);
    }
}

function generateTable(table, data) {
    for (let element of data) {
      let row = table.insertRow();
      for (key in element) {
        let cell = row.insertCell();
        let text = document.createTextNode(element[key]);
        cell.appendChild(text);
      }
    }
  }


