// Script para probar los horarios disponibles
const slots = [];
for (let hour = 10; hour < 18; hour++) {
  for (let minute = 0; minute < 60; minute += 30) {
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    slots.push(time);
  }
}
slots.push('17:30');

console.log('🕐 Horarios disponibles:');
console.log('========================');
slots.forEach((slot, index) => {
  console.log(`${index + 1}. ${slot}`);
});

console.log(`\n📊 Total de horarios: ${slots.length}`);
console.log(`⏰ Primer horario: ${slots[0]}`);
console.log(`⏰ Último horario: ${slots[slots.length - 1]}`); 