import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Transporter, InsertTransporter, personTypeEnum, documentSchema, subsidiarySchema, brazilianStates } from "@shared/schema";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "../ui/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Upload, File, FileText } from "lucide-react";

// Interface para filial
interface Subsidiary {
  cnpj: string;
  name: string;
  tradeName?: string;
  street?: string;
  number?: string;
  complement?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  documents: string[];
}

// Interface para documento
interface Document {
  type: string;
  url: string;
  filename: string;
}

interface TransporterFormProps {
  transporter?: Transporter;
  onSuccess?: () => void;
}

export function TransporterForm({ transporter, onSuccess }: TransporterFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [personType, setPersonType] = useState<"pj" | "pf">(transporter?.personType as "pj" | "pf" || "pj");
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>(
    transporter?.subsidiaries ? JSON.parse(transporter.subsidiaries as string) : []
  );
  const [documents, setDocuments] = useState<Document[]>(
    transporter?.documents ? JSON.parse(transporter.documents as string) : []
  );
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({
    socialContract: null,
    powerOfAttorney: null,
  });
  
  // Formulário para pessoa jurídica
  const pjForm = useForm<InsertTransporter>({
    resolver: zodResolver(z.object({
      personType: personTypeEnum,
      name: z.string().min(3, "A razão social deve ter pelo menos 3 caracteres"),
      documentNumber: z.string().min(14, "CNPJ deve ter pelo menos 14 dígitos"),
      tradeName: z.string().optional(),
      legalResponsible: z.string().min(3, "Nome do responsável legal é obrigatório"),
      email: z.string().email("Email inválido"),
      phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
      street: z.string().min(3, "Logradouro é obrigatório"),
      number: z.string().min(1, "Número é obrigatório"),
      complement: z.string().optional(),
      district: z.string().min(2, "Bairro é obrigatório"),
      zipCode: z.string().min(8, "CEP deve ter 8 dígitos"),
      city: z.string().min(2, "Cidade é obrigatória"),
      state: z.string().min(2, "Estado é obrigatório"),
      // Campos para retro-compatibilidade
      contact1Name: z.string().optional(),
      contact1Phone: z.string().optional(),
      contact2Name: z.string().optional(),
      contact2Phone: z.string().optional(),
    })),
    defaultValues: {
      personType: "pj",
      name: transporter?.name || "",
      documentNumber: transporter?.documentNumber || "",
      tradeName: transporter?.tradeName || "",
      legalResponsible: transporter?.legalResponsible || "",
      email: transporter?.email || "",
      phone: transporter?.phone || "",
      street: transporter?.street || "",
      number: transporter?.number || "",
      complement: transporter?.complement || "",
      district: transporter?.district || "",
      zipCode: transporter?.zipCode || "",
      city: transporter?.city || "",
      state: transporter?.state || "",
      // Campos para retro-compatibilidade
      contact1Name: transporter?.contact1Name || "",
      contact1Phone: transporter?.contact1Phone || "",
    }
  });
  
  // Formulário para pessoa física
  const pfForm = useForm<InsertTransporter>({
    resolver: zodResolver(z.object({
      personType: personTypeEnum,
      name: z.string().min(3, "O nome completo deve ter pelo menos 3 caracteres"),
      documentNumber: z.string().min(11, "CPF deve ter 11 dígitos"),
      birthDate: z.string().min(8, "Data de nascimento é obrigatória"),
      nationality: z.string().min(2, "Nacionalidade é obrigatória"),
      idNumber: z.string().min(5, "RG é obrigatório"),
      idIssuer: z.string().min(2, "Órgão emissor é obrigatório"),
      idState: z.string().min(2, "UF do RG é obrigatória"),
      email: z.string().email("Email inválido"),
      phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
      // Campos para retro-compatibilidade
      contact1Name: z.string().optional(),
      contact1Phone: z.string().optional(),
    })),
    defaultValues: {
      personType: "pf",
      name: transporter?.name || "",
      documentNumber: transporter?.documentNumber || "",
      birthDate: transporter?.birthDate || "",
      nationality: transporter?.nationality || "Brasileira",
      idNumber: transporter?.idNumber || "",
      idIssuer: transporter?.idIssuer || "",
      idState: transporter?.idState || "",
      email: transporter?.email || "",
      phone: transporter?.phone || "",
      // Campos para retro-compatibilidade
      contact1Name: transporter?.name || "",
      contact1Phone: transporter?.phone || "",
    }
  });

  // Efeito para atualizar o tipo de pessoa quando o formulário mudar
  useEffect(() => {
    if (personType === "pj") {
      pjForm.setValue("personType", "pj");
    } else {
      pfForm.setValue("personType", "pf");
    }
  }, [personType, pjForm, pfForm]);

  // Adicionar uma nova filial
  const addSubsidiary = () => {
    setSubsidiaries([
      ...subsidiaries,
      {
        cnpj: "",
        name: "",
        tradeName: "",
        street: "",
        number: "",
        complement: "",
        zipCode: "",
        city: "",
        state: "",
        documents: []
      }
    ]);
  };

  // Remover uma filial
  const removeSubsidiary = (index: number) => {
    setSubsidiaries(subsidiaries.filter((_, i) => i !== index));
  };

  // Atualizar uma filial
  const updateSubsidiary = (index: number, field: keyof Subsidiary, value: any) => {
    const newSubsidiaries = [...subsidiaries];
    newSubsidiaries[index] = {
      ...newSubsidiaries[index],
      [field]: value
    };
    setSubsidiaries(newSubsidiaries);
  };

  // Lidar com upload de arquivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles({
        ...selectedFiles,
        [fileType]: e.target.files[0]
      });
    }
  };

  // Mutação para criar transportador
  const createTransporterMutation = useMutation({
    mutationFn: async (data: InsertTransporter) => {
      // Adicionar filiais e documentos
      const formData = new FormData();
      
      // Adicionar campos básicos
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // Adicionar filiais se for PJ
      if (data.personType === "pj") {
        formData.append("subsidiaries", JSON.stringify(subsidiaries));
      }
      
      // Adicionar arquivos
      Object.entries(selectedFiles).forEach(([key, file]) => {
        if (file) {
          formData.append(`document_${key}`, file);
        }
      });
      
      const response = await apiRequest("POST", "/api/admin/transporters", formData, { isFormData: true });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transportador criado",
        description: "O transportador foi cadastrado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transporters"] });
      
      // Resetar formulários
      pjForm.reset();
      pfForm.reset();
      setSubsidiaries([]);
      setDocuments([]);
      setSelectedFiles({
        socialContract: null,
        powerOfAttorney: null,
      });
      
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar transportador",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutação para atualizar transportador
  const updateTransporterMutation = useMutation({
    mutationFn: async (data: InsertTransporter) => {
      if (!transporter) throw new Error("Transportador não encontrado");
      
      // Adicionar filiais e documentos
      const formData = new FormData();
      
      // Adicionar campos básicos
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // Adicionar filiais se for PJ
      if (data.personType === "pj") {
        formData.append("subsidiaries", JSON.stringify(subsidiaries));
      }
      
      // Adicionar arquivos
      Object.entries(selectedFiles).forEach(([key, file]) => {
        if (file) {
          formData.append(`document_${key}`, file);
        }
      });
      
      const response = await apiRequest("PATCH", `/api/admin/transporters/${transporter.id}`, formData, { isFormData: true });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transportador atualizado",
        description: "O transportador foi atualizado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transporters"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar transportador",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handler para submissão do formulário
  const onSubmit = (data: InsertTransporter) => {
    // Copiar dados dos contatos para retro-compatibilidade
    if (personType === "pj") {
      data.contact1Name = data.legalResponsible;
      data.contact1Phone = data.phone;
    } else {
      data.contact1Name = data.name;
      data.contact1Phone = data.phone;
    }
    
    if (transporter) {
      updateTransporterMutation.mutate(data);
    } else {
      createTransporterMutation.mutate(data);
    }
  };

  const isPending = createTransporterMutation.isPending || updateTransporterMutation.isPending;

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto overflow-visible px-1 pb-24 sm:px-4 md:px-6">
      {/* Seleção de tipo de pessoa */}
      <div className="space-y-2">
        <Label>Tipo de Cadastro</Label>
        <RadioGroup 
          defaultValue={personType} 
          onValueChange={(value) => setPersonType(value as "pj" | "pf")}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pj" id="pj" />
            <Label htmlFor="pj">Pessoa Jurídica</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pf" id="pf" />
            <Label htmlFor="pf">Pessoa Física</Label>
          </div>
        </RadioGroup>
      </div>
      
      <Separator />
      
      {/* Formulário de Pessoa Jurídica */}
      {personType === "pj" && (
        <Form {...pjForm}>
          <form onSubmit={pjForm.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="w-full overflow-hidden">
              <CardHeader>
                <CardTitle>Dados do Transportador (Matriz)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 overflow-visible">
                {/* CNPJ e Razão Social */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={pjForm.control}
                    name="documentNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ Principal</FormLabel>
                        <FormControl>
                          <Input placeholder="Somente números" {...field} />
                        </FormControl>
                        <FormDescription>Informe o CNPJ com 14 dígitos</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={pjForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Razão Social</FormLabel>
                        <FormControl>
                          <Input placeholder="Razão social" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={pjForm.control}
                    name="tradeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fantasia</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome Fantasia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Informações de Contato */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium">Informações de Contato</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={pjForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 00000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={pjForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@empresa.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={pjForm.control}
                    name="legalResponsible"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável Legal</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do responsável legal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Endereço da Matriz */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium">Endereço da Matriz</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={pjForm.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logradouro</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, Avenida, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={pjForm.control}
                        name="number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input placeholder="Nº" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pjForm.control}
                        name="complement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input placeholder="Sala, conjunto, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField
                      control={pjForm.control}
                      name="district"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input placeholder="Bairro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={pjForm.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="Somente números" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={pjForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={pjForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UF</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="UF" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {brazilianStates.map((state) => (
                                  <SelectItem key={state.code} value={state.code}>
                                    {state.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Documentos Anexos */}
            <Card className="w-full overflow-hidden">
              <CardHeader>
                <CardTitle>Documentos Anexos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 overflow-visible">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="socialContract">Contrato Social</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="socialContract"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, "socialContract")}
                        className="flex-1"
                      />
                      {selectedFiles.socialContract && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <FileText size={16} />
                          <span>{selectedFiles.socialContract.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="powerOfAttorney">Procuração (se aplicável)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="powerOfAttorney"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, "powerOfAttorney")}
                        className="flex-1"
                      />
                      {selectedFiles.powerOfAttorney && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <FileText size={16} />
                          <span>{selectedFiles.powerOfAttorney.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Filiais (Vincular CNPJs Adicionais) */}
            <Card className="w-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>FILIAIS (Vincular CNPJs Adicionais)</CardTitle>
                  <CardDescription>Adicione aqui as filiais, se existirem</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSubsidiary}>
                  <Plus size={16} className="mr-2" />
                  Adicionar Nova Filial
                </Button>
              </CardHeader>
              <CardContent className="overflow-visible max-h-[70vh] overflow-y-auto">
                {subsidiaries.length === 0 ? (
                  <div className="text-center p-4 text-muted-foreground">
                    Nenhuma filial cadastrada. Clique no botão acima para adicionar.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {subsidiaries.map((subsidiary, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-medium">Filial #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSubsidiary(index)}
                          >
                            <Trash2 size={16} className="mr-2" />
                            Remover
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>CNPJ Filial</Label>
                            <Input
                              value={subsidiary.cnpj}
                              onChange={(e) => updateSubsidiary(index, "cnpj", e.target.value)}
                              placeholder="Somente números"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Razão Social</Label>
                            <Input
                              value={subsidiary.name}
                              onChange={(e) => updateSubsidiary(index, "name", e.target.value)}
                              placeholder="Razão social da filial"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Nome Fantasia</Label>
                          <Input
                            value={subsidiary.tradeName || ""}
                            onChange={(e) => updateSubsidiary(index, "tradeName", e.target.value)}
                            placeholder="Nome Fantasia da filial"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Endereço da Filial</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Logradouro</Label>
                              <Input
                                value={subsidiary.street || ""}
                                onChange={(e) => updateSubsidiary(index, "street", e.target.value)}
                                placeholder="Rua, Avenida, etc."
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Número</Label>
                                <Input
                                  value={subsidiary.number || ""}
                                  onChange={(e) => updateSubsidiary(index, "number", e.target.value)}
                                  placeholder="Nº"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Complemento</Label>
                                <Input
                                  value={subsidiary.complement || ""}
                                  onChange={(e) => updateSubsidiary(index, "complement", e.target.value)}
                                  placeholder="Sala, etc."
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>CEP</Label>
                              <Input
                                value={subsidiary.zipCode || ""}
                                onChange={(e) => updateSubsidiary(index, "zipCode", e.target.value)}
                                placeholder="Somente números"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Cidade</Label>
                              <Input
                                value={subsidiary.city || ""}
                                onChange={(e) => updateSubsidiary(index, "city", e.target.value)}
                                placeholder="Cidade"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>UF</Label>
                              <Select
                                value={subsidiary.state || ""}
                                onValueChange={(value) => updateSubsidiary(index, "state", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="UF" />
                                </SelectTrigger>
                                <SelectContent>
                                  {brazilianStates.map((state) => (
                                    <SelectItem key={state.code} value={state.code}>
                                      {state.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`contractFile-${index}`} />
                            <Label htmlFor={`contractFile-${index}`}>Contrato Social (com alteração de filial)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`powerOfAttorneyFile-${index}`} />
                            <Label htmlFor={`powerOfAttorneyFile-${index}`}>Procuração (se aplicável)</Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Processando...</span>
                  </>
                ) : transporter ? (
                  "Atualizar Transportador"
                ) : (
                  "Cadastrar Transportador"
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
      
      {/* Formulário de Pessoa Física */}
      {personType === "pf" && (
        <Form {...pfForm}>
          <form onSubmit={pfForm.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="w-full overflow-hidden">
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 overflow-visible">
                {/* CPF e Nome Completo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={pfForm.control}
                    name="documentNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input placeholder="Somente números" {...field} />
                        </FormControl>
                        <FormDescription>Informe o CPF com 11 dígitos</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={pfForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={pfForm.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={pfForm.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nacionalidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Nacionalidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Documentos */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium">Documentos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField
                      control={pfForm.control}
                      name="idNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RG</FormLabel>
                          <FormControl>
                            <Input placeholder="Número do RG" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={pfForm.control}
                      name="idIssuer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Órgão Emissor</FormLabel>
                          <FormControl>
                            <Input placeholder="SSP, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={pfForm.control}
                      name="idState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UF</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="UF" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {brazilianStates.map((state) => (
                                <SelectItem key={state.code} value={state.code}>
                                  {state.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Contato */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium">Contato</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={pfForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Celular</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 00000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={pfForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Documentos Anexos */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium">Documentos Anexos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rgCpfDoc">RG e CPF (frente e verso)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="rgCpfDoc"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(e, "rgCpfDoc")}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Processando...</span>
                  </>
                ) : transporter ? (
                  "Atualizar Transportador"
                ) : (
                  "Cadastrar Transportador"
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}