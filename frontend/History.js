const cleanValue = (value) => {
  const text = String(value || "").replace(/^[*\s]+|[*\s]+$/g, "").trim();
  return text || "Unknown";
};

fetch("http://localhost:5000/history")
  .then(res => res.json())
  .then(data => {
    const table = document.querySelector("#historyTable tbody");
    table.innerHTML = "";

    data.forEach(item => {
      table.innerHTML += `
        <tr>
          <td>${item.nitrogen}</td>
          <td>${item.phosphorus}</td>
          <td>${item.potassium}</td>
          <td>${item.temperature}</td>
          <td>${item.humidity}</td>
          <td>${item.rainfall}</td>
          <td>${cleanValue(item.crop)}</td>
          <td>${cleanValue(item.fertilizer)}</td>
          <td>
            <button class="table-btn delete-btn" onclick="deleteData('${item._id}')">Delete</button>
          </td>
        </tr>
      `;
    });
  });

function deleteData(id) {
  if (confirm("Are you sure to delete?")) {
    fetch(`http://localhost:5000/delete/${id}`, {
      method: "DELETE"
    })
    .then(res => res.json())
    .then(() => {
      alert("Deleted successfully");
      location.reload();
    });
  }
}