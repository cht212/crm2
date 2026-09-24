<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('customer_customers', function (Blueprint $table) {
            $table->id();
            $table->string("company_name")->unique();
            $table->string("tax_number")->unique();
            $table->string("trade_name");
            $table->string("email");
            $table->string("phone");
            $table->string("address");
            $table->string("department");
            $table->string("province");
            $table->string("district");
            $table->boolean("is_active")->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_customers');
    }
};
